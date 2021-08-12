const fs = require('fs')
const fetch = require('node-fetch')
const { flags } = require('@oclif/command')
const Console = require('../utils/console')
const { isUrl, findInFile, showErrors, showWarnings } = require('../utils/audit')
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

        // Build exercises if they are not built yet.
        if (!this.configManager.get().exercises) this.configManager.buildIndex()

        // Get configuration object.
        const config = this.configManager.get();

        let errors = []
        let warnings = []

        // This function checks that each of the url's are working.
        const checkUrl = async (file, exercise) => {
            if (!fs.existsSync(file.path)) return false
            const content = fs.readFileSync(file.path).toString();
            const frontmatter = fm(content).attributes
            for (const attribute in frontmatter) {
                if (attribute === "intro" || attribute === "tutorial") {
                    let res = await fetch(frontmatter[attribute], { method: "HEAD" });
                    if (!res.ok) errors.push({ exercise: exercise, msg: `This link is broken (${res.ok}): ${frontmatter[attribute]}` })
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
                        if (obj[img].absUrl !== "../../" || obj[img].absUrl !== "./../../") errors.push({ exercise: exercise, msg: `The path for this image (${obj[img].relUrl}) is incorrect` })

                        // Validates if the image is in the assets folder.
                        if (!fs.existsSync(obj[img].relUrl)) errors.push({ exercise: exercise, msg: `The file ${obj[img].relUrl} doesn't exist in the assets folder.` })
                    }
                } else if (finding === "external_images" && Object.keys(obj).length > 0) {
                    // Valdites all the aboslute path images.
                    for (const img in obj) {
                        let res = await fetch(obj[img].absUrl, { method: "HEAD" });
                        if (!res.ok) errors.push({ exercise: exercise, msg: `This link is broken: ${obj[img].absUrl}` })
                    }
                } else if (finding === "markdown_links" && Object.keys(obj).length > 0) {
                    // This was working but linkCheck, stopped working
                    for (const link in obj) {
                        let res = await fetch(obj[link].mdUrl, { method: "HEAD" });
                        if (!res.ok) errors.push({ exercise: exercise, msg: `This link is broken: ${obj[link].mdUrl}` })
                    }
                }
            }
            return true
        }

        // This function is being created because the find method doesn't work with promises.
        const find = async (file, lang, exercise) => {
            if (file.name === lang) {
                await checkUrl(file, exercise)
                return true
            }
            return false
        }

        // These two lines check if the 'slug' property is inside the configuration object.
        Console.debug("Checking if the slug property is inside the configuration object...")
        if (!config.slug) errors.push({ exercise: null, msg: "The slug property is not in the configuration object" })

        // These two lines check if the 'repository' property is inside the configuration object.
        Console.debug("Checking if the repository property is inside the configuration object...")
        if (!config.repository) errors.push({ exercise: null, msg: "The repository property is not in the configuration object" })
        else isUrl(config.repository, errors)

        // These two lines check if the 'description' property is inside the configuration object.
        Console.debug("Checking if the description property is inside the configuration object...")
        if (!config.description) errors.push({ exercise: null, msg: "The description property is not in the configuration object" })

        // Validates if images and links are working at every README file.
        let exercises = config.exercises
        let readmeFiles = []

        if (exercises.length > 0) {
            for (const index in exercises) {
                let exercise = exercises[index]
                let readmeFilesCount = 0;
                if (Object.keys(exercise.translations).length == 0) errors.push({ exercise: exercise.title, msg: `The exercise ${exercise.title} doesn't have a README.md file.` })

                for (const lang in exercise.translations) {
                    let files = []
                    for (const file of exercise.files) {
                        let found = await find(file, exercise.translations[lang], exercise.title)
                        if (found == true) readmeFilesCount++
                        files.push(found)
                    }
                    if (!files.includes(true)) errors.push({ exercise: exercise.title, msg: `This exercise doesn't have a README.md file.` })

                }
                readmeFiles.push(readmeFilesCount)
            }
        } else errors.push({ exercise: null, msg: "The exercises array is empty." })

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