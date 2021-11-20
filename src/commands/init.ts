import {flags} from '@oclif/command'
import BaseCommand from '../utils/BaseCommand'

import * as fs from 'fs'
import * as prompts from 'prompts'
import cli from 'cli-ux'
import * as eta from 'eta'

import Console from '../utils/console'
import {ValidationError} from '../utils/errors'
import defaults from '../managers/config/defaults'

import * as path from 'path'

class InitComand extends BaseCommand {
  static description =
    'Create a new learning package: Book, Tutorial or Exercise'

  static flags = {
    ...BaseCommand.flags,
    grading: flags.help({char: 'h'}),
  }

  async run() {
    /* const {flags} = */ this.parse(InitComand)

    Console.log(Object.getOwnPropertyNames(this))

    const choices = await prompts([
      {
        type: 'select',
        name: 'grading',
        message: 'Is the auto-grading going to be isolated or incremental?',
        choices: [
          {
            title: 'Incremental: Build on top of each other like a tutorial',
            value: 'incremental',
          },
          {title: 'Isolated: Small separated exercises', value: 'isolated'},
          {
            title: 'No grading: No feedback or testing whatsoever',
            value: null,
          },
        ],
      },
      {
        type: 'text',
        name: 'title',
        initial: 'My Interactive Tutorial',
        message: 'Title for your tutorial? Press enter to leave as it is',
      },
      {
        type: 'text',
        name: 'description',
        initial: '',
        message: 'Description for your tutorial? Press enter to leave blank',
      },
      {
        type: 'select',
        name: 'difficulty',
        message: 'How difficulty will be to complete the tutorial?',
        choices: [
          {title: 'Begginer (no previous experience)', value: 'beginner'},
          {title: 'Easy (just a bit of experience required)', value: 'easy'},
          {
            title: 'Intermediate (you need experience)',
            value: 'intermediate',
          },
          {title: 'Hard (master the topic)', value: 'hard'},
        ],
      },
      {
        type: 'text',
        name: 'duration',
        initial: '1',
        message: 'How many hours avg it takes to complete (number)?',
        validate: (value: any) => {
          const n = Math.floor(Number(value))
          return (
            n !== Number.POSITIVE_INFINITY && String(n) === value && n >= 0
          )
        },
      },
    ])

    const packageInfo = {
      ...defaults.config,
      grading: choices.grading,
      difficulty: choices.difficulty,
      duration: Number.parseInt(choices.duration, 10),
      description: choices.description,
      title: choices.title,
      slug: choices.title
      .toLowerCase()
      .replace(/ /g, '-')
      .replace(/[^\w-]+/g, ''),
    }

    cli.action.start('Initializing package')

    fs.readdir('./', function (err, files) {
      files = files.filter(f => f !== '.node-persist' && f !== '.git')
      if (err) {
        throw ValidationError(err.message)
      } else {
        if (files.length === 0) {
          const templatesDir = '../utils/templates'
          fs.writeFileSync(
            './learn.json',
            JSON.stringify(packageInfo, null, 2),
          )

          fs.writeFileSync(
            './README.md',
            eta.render(
              fs.readFileSync(
                path.resolve(__dirname, `${templatesDir}/README.ejs`),
                'utf-8',
              ),
              packageInfo,
            ),
          )

          cli.action.stop()
          Console.success('😋 Package initialized successfully')

          return true
        }

        cli.action.stop()
        throw ValidationError(
          `The directory must be empty in order to start creating the exercises: ${files.join(
            ',',
          )}`,
        )
      }
    })
  }
}

export default InitComand
