const fs = require('fs')
const request = require('request');
const linkCheck = require('link-check');
const { flags } = require('@oclif/command')
const Console = require('../utils/console')
const SessionCommand = require('../utils/SessionCommand');

class AuditCommand extends SessionCommand {
    async init() {
        const { flags } = this.parse(AuditCommand)
        await this.initSession(flags)
    }
    async run() {
        const { flags } = this.parse(AuditCommand)

        // These two lines check if the 'slug' property is inside the configuration object.
        Console.debug("Checking if the slug property is inside the configuration object...")
        if (this.configManager.get().slug) Console.success("The slug property is inside the configuration object")
        else Console.error("The slug property is not in the configuration object")

        // These two lines check if the 'repository' property is inside the configuration object.
        Console.debug("Checking if the repository property is inside the configuration object...")
        if (this.configManager.get().repository) Console.success("The repository property is inside the configuration object")
        else Console.error("The repository property is not in the configuration object")

        // These two lines check if the 'description' property is inside the configuration object.
        Console.debug("Checking if the description property is inside the configuration object...")
        if (this.configManager.get().description) Console.success("The description property is inside the configuration object")
        else Console.error("The description property is not in the configuration object")

        const findInFile = (types, content) => {

            const regex = {
                relative_images: /!\[.*\]\s*\(((\.\/)?(\.{2}\/){2,5})(.*\.[a-zA-Z]{2,4}).*\)/gm,
                external_images: /!\[.*\]\((https?:\/(\/{1}[^/)]+)+\/?)\)/gm,
                markdown_links: /(\s)+\[.*\]\((https?:\/(\/{1}[^/)]+)+\/?)\)/gm,
                url: /(https?:\/\/[a-zA-Z_\-.\/0-9]+)/gm,
                uploadcare: /https:\/\/ucarecdn.com\/(?:.*\/)*([a-zA-Z_\-.\/0-9]+)/gm
            }

            const validTypes = Object.keys(regex);
            if (!Array.isArray(types)) types = [types];

            let findings = {}

            types.forEach(type => {
                if (!validTypes.includes(type)) throw Error("Invalid type: " + type)
                else findings[type] = {};
            });

            types.forEach(type => {

                let count = 0;
                let m;
                while ((m = regex[type].exec(content)) !== null) {
                    // This is necessary to avoid infinite loops with zero-width matches
                    if (m.index === regex.lastIndex) {
                        regex.lastIndex++;
                    }

                    // The result can be accessed through the `m`-variable.
                    // m.forEach((match, groupIndex) => values.push(match));
                    count++;

                    findings[type][m[0]] = {
                        content: m[0],
                        absUrl: m[1],
                        mdUrl: m[2],
                        relUrl: m[4]
                    }
                }
            })

            return findings;
        }

        const checkUrl = (file) => {
            const content = fs.readFileSync(file.path).toString();
            const findings = findInFile(["relative_images", "external_images", "markdown_links"], content);
            for (const finding in findings) {
                let obj = findings[finding];
                if (finding === "relative_images" && Object.keys(obj).length > 0) {
                    // Valdites all the relative path images.
                    for (const img in obj) {
                        // Validates if the path is correct
                        if (obj[img].absUrl !== "../../") Console.error(`The path for this image (${obj[img].relUrl}) is incorrect`)

                        // Validates if the image is in the assets folder.
                        if (!fs.existsSync(obj[img].relUrl)) Console.error(`The file ${obj[img].relUrl} doesn't exist in the assets folder.`)
                    }
                } else if (finding === "absolut_images" && Object.keys(obj).length > 0) {
                    // Valdites all the aboslute path images.
                    for (const img in obj) request(obj[img].absUrl, (error) => error && Console.error(`Cannot access to this image: ${obj[img].absUrl}`));
                } else if (finding === "markdown_links" && Object.keys(obj).length > 0) {
                    // This still not working
                    for (const link in obj) {
                        linkCheck(obj[link].mdUrl, function (err, result) {
                            if (err) {
                                Console.error(err);
                                return;
                            }
                            if (result.status === "dead") Console.error(`This link is broken: ${result.link}`)
                        });
                    }
                }
            }
        }

        // Validates if images and links are working.
        let exercises = this.configManager.get().exercises
        exercises ? exercises.map(exercise => {
            for(const lang in exercise.translations){
                if (!exercise.files.find(file => {
                    if (file.name == exercise.translations[lang]) {
                        checkUrl(file)
                        return true
                    }
                    return false;
                })) Console.error(`The exercise ${exercise.title} doesn't have a README.md file.`)
            }
        }) : Console.error("The exercises array is empty.")

        // Checks if the .gitignore file exists.
        if (!fs.existsSync(`.gitignore`)) Console.info(".gitignore file doesn't exist")
    }
}

AuditCommand.description = `Check if the configuration object has slug, description and repository property
...
Extra documentation goes here
`

AuditCommand.flags = {
    // name: flags.string({char: 'n', description: 'name to print'}),
}

module.exports = AuditCommand