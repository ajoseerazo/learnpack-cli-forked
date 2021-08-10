const fs = require('fs')
const request = require('request');
const linkCheck = require('link-check');
const { flags } = require('@oclif/command')
const Console = require('../utils/console')
const SessionCommand = require('../utils/SessionCommand');
const fm = require("front-matter")

class AuditCommand extends SessionCommand {
    async init() {
        const { flags } = this.parse(AuditCommand)
        await this.initSession(flags)
    }
    async run() {
        const { flags } = this.parse(AuditCommand)

        Console.log("Running command audit...")

        let errors = []
        let warnings = []

        // These two lines check if the 'slug' property is inside the configuration object.
        Console.debug("Checking if the slug property is inside the configuration object...")
        if (!this.configManager.get().slug) errors.push("The slug property is not in the configuration object")

        // These two lines check if the 'repository' property is inside the configuration object.
        Console.debug("Checking if the repository property is inside the configuration object...")
        if (!this.configManager.get().repository) errors.push("The repository property is not in the configuration object")

        // These two lines check if the 'description' property is inside the configuration object.
        Console.debug("Checking if the description property is inside the configuration object...")
        if (!this.configManager.get().description) errors.push("The description property is not in the configuration object")

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
            if(!fs.existsSync(file.path)) return false
            const content = fs.readFileSync(file.path).toString();
            const frontmatter = fm(content).attributes
            for(const attribute in frontmatter){
                if(attribute === "intro" || attribute ==="tutorial"){
                    request(frontmatter[attribute], (error) => error && errors.push(`Cannot access to this video: ${frontmatter[attribute]}`));
                }
            }

            // Check url's of each README file.
            const findings = findInFile(["relative_images", "external_images", "markdown_links"], content);
            for (const finding in findings) {
                let obj = findings[finding];
                if (finding === "relative_images" && Object.keys(obj).length > 0) {
                    // Valdites all the relative path images.
                    for (const img in obj) {
                        // Validates if the path is correct
                        if (obj[img].absUrl !== "../../") errors.push(`The path for this image (${obj[img].relUrl}) is incorrect`)
                        
                        // Validates if the image is in the assets folder.
                        if (!fs.existsSync(obj[img].relUrl)) errors.push(`The file ${obj[img].relUrl} doesn't exist in the assets folder.`)
                    }
                } else if (finding === "external_images" && Object.keys(obj).length > 0) {
                    // Valdites all the aboslute path images.
                    for (const img in obj) request(obj[img].absUrl, (error) => error && errors.push(`Cannot access to this image: ${obj[img].absUrl}`));
                } else if (finding === "markdown_links" && Object.keys(obj).length > 0) {
                    // This was working but linkCheck, stopped working
                    for (const link in obj) {
                        linkCheck(obj[link].mdUrl, function (err, result) {
                            if (err) {
                                errors.push(err);
                                return;
                            }
                            if (result.status === "dead") errors.push(`This link is broken: ${result.link}`)
                        });
                    }
                }
            }
            return true
        }

        // Validates if images and links are working at every README file.
        let exercises = this.configManager.get().exercises
        let readmeFiles = []
        exercises ? exercises.map(exercise => {
            let readmeFilesCount = 0;
            for(const lang in exercise.translations){
                if (!exercise.files.find(file => {
                    if (file.name == exercise.translations[lang]) {
                        if(checkUrl(file)) readmeFilesCount++
                        return true
                    }
                    return false;
                })) errors.push(`The exercise ${exercise.title} doesn't have a README.md file.`)
            }
            readmeFiles.push(readmeFilesCount)
        }) : errors.push("The exercises array is empty.")
        
        // Check if all the exercises has the same ammount of README's, this way we can check if they have the same ammount of translations.
        if(!readmeFiles.every((item, index, arr)=> item == arr[0])) warnings.push(`Some exercises are missing translations.`)

        // Checks if the .gitignore file exists.
        if (!fs.existsSync(`.gitignore`)) warnings.push(".gitignore file doesn't exist")

        if(warnings.length > 0){
            Console.log("Checking for warnings...")
            warnings.forEach((warning, i) => {
                Console.warning(`${i+1}) ${warning}`)
            })
        }

        if(errors.length > 0) {
            Console.log("Checking for errors...")
            errors.forEach((error, i) => {
                Console.error(`${i+1}) ${error}`)
            })
            process.exit(1)
        } else {
            Console.success("We didn't find any errors in this repository.")
            process.exit(0)
        }

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