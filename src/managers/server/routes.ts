import Console from '../../utils/console'
import * as express from 'express'
import * as fs from 'fs'
import * as bodyParser from 'body-parser'
import socket from '../socket'
// import gitpod from '../gitpod'
import {detect, filterFiles} from '../config/exercise'
import {IFile} from '../../models/file'
import {IConfigObj} from '../../models/config'
import {IConfigManager} from '../../models/config-manager'

const withHandler =
  (func: (req: express.Request, res: express.Response) => void) =>
    (req: express.Request, res: express.Response) => {
      try {
        func(req, res)
      } catch (error) {
        Console.debug(error)
        const _err = {
          message: (error as TypeError).message || 'There has been an error',
          status: (error as any).status || 500,
          type: (error as any).type || null,
        }
        Console.error(_err.message)

        // send rep to the server
        res.status(_err.status)
        res.json(_err)
      }
    }

export default async function (
  app: express.Application,
  configObject: IConfigObj,
  configManager: IConfigManager,
) {
  const {config, exercises} = configObject
  app.get(
    '/config',
    withHandler((_: express.Request, res: express.Response) => {
      res.json(configObject)
    }),
  )

  app.get(
    '/exercise',
    withHandler((_: express.Request, res: express.Response) => {
      res.json(exercises)
    }),
  )

  app.get(
    '/exercise/:slug/readme',
    withHandler(
      (
        {params: {slug}, query: {lang}}: express.Request,
        res: express.Response,
      ) => {
        const readme = configManager
        .getExercise(slug)
        .getReadme((lang as string) || null)
        res.json(readme)
      },
    ),
  )

  app.get(
    '/exercise/:slug/report',
    withHandler(
      ({params: {slug}}: express.Request, res: express.Response) => {
        const report = configManager.getExercise(slug).getTestReport()
        res.json(JSON.stringify(report))
      },
    ),
  )

  app.get(
    '/exercise/:slug',
    withHandler(
      ({params: {slug}}: express.Request, res: express.Response) => {
        const exercise = configManager.getExercise(slug)

        // if we are in incremental grading, the entry file can by dinamically detected
        // based on the changes the student is making during the exercise
        if (config?.grading === 'incremental') {
          const entries = new Set(
            Object.keys(config.entries).map(lang => config.entries[lang]),
          )
          const scanedFiles = fs.readdirSync('./')
          const onlyEntries = scanedFiles.filter(fileName =>
            entries.has(fileName),
          )
          const detected = detect(config, onlyEntries)

          // update the file hierarchy with updates
          exercise.files = [
            ...exercise.files.filter((f: IFile) => f.name.includes('test.')),
            ...filterFiles(scanedFiles),
          ]
          Console.debug('Exercise updated files: ', exercise.files)
          // if a new language for the testing engine is detected, we replace it
          // if not we leave it as it was before
          if (detected?.language) {
            Console.debug(
              `Switching to ${detected.language} engine in this exercise`,
            )
            exercise.language = detected.language
          }

          // WARNING: has to be the FULL PATH to the entry path
          exercise.entry = detected?.entry
          Console.debug(`Exercise detected entry: ${detected?.entry}`)
        }

        if (!exercise.graded || config?.disableGrading) {
          socket.removeAllowed('test')
        } else {
          socket.addAllowed('test')
        }

        if (!exercise.entry) {
          socket.removeAllowed('build')
        } else {
          socket.addAllowed('build')
        }

        if (
          exercise.files.filter(
            (f: IFile) =>
              !f.name.toLowerCase().includes('readme.') &&
              !f.name.toLowerCase().includes('test.'),
          ).length === 0
        ) {
          socket.removeAllowed('reset')
        } else {
          socket.addAllowed('reset')
        }

        socket.log('ready')

        res.json(exercise)
      },
    ),
  )

  app.get(
    '/exercise/:slug/file/:fileName',
    withHandler((req: express.Request, res: express.Response) => {
      res.write(
        configManager.getExercise(req.params.slug).getFile(req.params.fileName),
      )
      res.end()
    }),
  )

  const textBodyParser = bodyParser.text()
  app.put(
    '/exercise/:slug/file/:fileName',
    textBodyParser,
    withHandler((req: express.Request, res: express.Response) => {
      // const result =
      configManager
      .getExercise(req.params.slug)
      .saveFile(req.params.fileName, req.body)
      res.end()
    }),
  )

  if (config?.outputPath) {
    app.use('/preview', express.static(config.outputPath))
  }

  app.use('/', express.static(`${config?.dirPath}/_app`))
}
