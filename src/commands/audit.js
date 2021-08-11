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

        // Build exercises
        this.configManager.buildIndex()

        let errors = []
        let warnings = []

        // These two lines check if the 'slug' property is inside the configuration object.
        Console.debug("Checking if the slug property is inside the configuration object...")
        if (!this.configManager.get().slug) errors.push({exercise: null, msg: "The slug property is not in the configuration object"})

        // These two lines check if the 'repository' property is inside the configuration object.
        Console.debug("Checking if the repository property is inside the configuration object...")
        if (!this.configManager.get().repository) errors.push({exercise: null, msg: "The repository property is not in the configuration object"})

        // These two lines check if the 'description' property is inside the configuration object.
        Console.debug("Checking if the description property is inside the configuration object...")
        if (!this.configManager.get().description) errors.push({exercise: null, msg: "The description property is not in the configuration object"})

        const findInFile = (types, content) => {

            const regex = {
                relative_images: /!\[.*\]\s*\(((\.\/)?(\.{2}\/){1,5})(.*\.[a-zA-Z]{2,4}).*\)/gm,
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

        // This function does the request to check if the images, videos and links are working.
        function doRequest(url) {
            return new Promise(function (resolve, reject) {
                request(url, function (error, res, body) {
                    if (!error && res.statusCode == 200) {
                        resolve(body);
                    } else {
                        reject(error)
                    }
                });
            });
        }

        // This function checks that each of the url's are working.
        async function checkUrl(file, exercise) {
            if (!fs.existsSync(file.path)) return false
            const content = fs.readFileSync(file.path).toString();
            const frontmatter = fm(content).attributes
            for (const attribute in frontmatter) {
                if (attribute === "intro" || attribute === "tutorial") {
                    await doRequest(frontmatter[attribute]).catch((err) => errors.push({exercise: exercise, msg: `This link is broken: ${frontmatter[attribute]}`}))
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
                        if (obj[img].absUrl !== "../../" || obj[img].absUrl !== "./../../") errors.push({exercise: exercise, msg: `The path for this image (${obj[img].relUrl}) is incorrect`})

                        // Validates if the image is in the assets folder.
                        if (!fs.existsSync(obj[img].relUrl)) errors.push({exercise: exercise, msg: `The file ${obj[img].relUrl} doesn't exist in the assets folder.`})
                    }
                } else if (finding === "external_images" && Object.keys(obj).length > 0) {
                    // Valdites all the aboslute path images.
                    for (const img in obj) {
                        await doRequest(obj[img].absUrl).catch((err) => errors.push({exercise: exercise, msg: `This link is broken: ${obj[img].absUrl}`}))
                    }
                } else if (finding === "markdown_links" && Object.keys(obj).length > 0) {
                    // This was working but linkCheck, stopped working
                    for (const link in obj) {
                        await doRequest(obj[link].mdUrl).catch((err) => errors.push({exercise: exercise, msg: `This link is broken: ${obj[link].mdUrl}`}))
                    }
                }
            }
            return true
        }

        // This function is being created because the find method doesn't work with promises.
        async function find(file, lang, exercise){
            if(file.name === lang){
                await checkUrl(file, exercise)
                return true
            }
            return false
        }

        // This function checks if there are errors, and show them in the console at the end.
        function showErrors(errors) {
            return new Promise((resolve, reject) => {
                if (errors) {
                    if (errors.length > 0) {
                        Console.log("Checking for errors...")
                        errors.forEach((error, i) => Console.error(`${i + 1}) ${error.msg} ${error.exercise && `(Exercise: ${error.exercise})`}`))
                        process.exit(1)
                    } else {
                        Console.success("We didn't find any errors in this repository.")
                        process.exit(0)
                    }
                    resolve("SUCCESS")
                } else {
                    reject("Failed")
                }
            })
        }

        // This function checks if there are warnings, and show them in the console at the end.
        function showWarnings(warnings) {
            return new Promise((resolve, reject) => {
                if (warnings) {
                    if (warnings.length > 0) {
                        Console.log("Checking for warnings...")
                        warnings.forEach((warning, i) => Console.warning(`${i + 1}) ${warning}`))
                    }
                    resolve("SUCCESS")
                } else {
                    reject("Failed")
                }
            })
        }
        
        // Validates if images and links are working at every README file.
        let exercises = this.configManager.get().exercises
        let readmeFiles = []

        if(exercises.length > 0){
            for(const index in exercises){
                let exercise = exercises[index]
                let readmeFilesCount = 0;
                if(Object.keys(exercise.translations).length == 0) errors.push({exercise: exercise.title, msg: `The exercise ${exercise.title} doesn't have a README.md file.`})
                
                for(const lang in exercise.translations){
                    let files = []
                    for(const file of exercise.files){
                        let found = await find(file, exercise.translations[lang], exercise.title)
                        if(found == true) readmeFilesCount++
                        files.push(found)
                    }
                    if(!files.includes(true)) errors.push({exercise: exercise.title, msg: `This exercise doesn't have a README.md file.`})

                }
                readmeFiles.push(readmeFilesCount)
            }
        } else errors.push({exercise: null, msg: "The exercises array is empty."})
        
        // Check if all the exercises has the same ammount of README's, this way we can check if they have the same ammount of translations.
        if (!readmeFiles.every((item, index, arr) => item == arr[0])) warnings.push(`Some exercises are missing translations.`)

        // Checks if the .gitignore file exists.
        if (!fs.existsSync(`.gitignore`)) warnings.push(".gitignore file doesn't exist")

        await showWarnings(warnings)
        await showErrors(errors)
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