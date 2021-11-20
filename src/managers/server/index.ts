import * as express from 'express'
import Console from '../../utils/console'
import addRoutes from './routes'
import cli from 'cli-ux'
import * as http from 'http'
import {IConfigObj} from '../../models/config'

export default async function (configObj: IConfigObj, configManager: any) {
  const {config} = configObj
  const app = express()
  const server = http.createServer(app)

  app.use(function (
    _: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) {
    res.header('Access-Control-Allow-Origin', '*')
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept',
    )
    res.header('Access-Control-Allow-Methods', 'GET,PUT')
    next()
  })

  // add all needed endpoints
  await addRoutes(app, configObj, configManager)

  server.listen(config?.port, function () {
    Console.success(
      'Exercises are running 😃 Open your browser to start practicing!',
    )
    Console.success('\n            Open the exercise on this link:')
    if (config?.editor.mode === 'gitpod')
      Console.log(
        `            https://${config.port}-${config.address.slice(8)}`,
      )
    else {
      Console.log(`            ${config?.address}:${config?.port}`)
      cli.open(`${config?.address}:${config?.port}`)
    }
  })

  return server
}
