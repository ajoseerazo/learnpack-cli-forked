// import { flags } from "@oclif/command";
import BaseCommand from './BaseCommand'
import Console from './console'
import SessionManager from '../managers/session'
import configManager from '../managers/config/index'
import {AuthError} from './errors'

export default class SessionCommand extends BaseCommand {
  session: any = null
  configManager: any = null
  static flags: any

  constructor(args: any) {
    super(args)
    this.configManager = null
    this.session = null
  }

  async initSession(flags: any, _private: boolean) {
    try {
      if (!this.configManager) {
        await this.buildConfig(flags)
      }

      this.session = await SessionManager.get(this.configManager?.get())
      if (this.session) {
        Console.debug(`Session open for ${this.session.payload.email}.`)
      } else {
        if (_private)
          throw new AuthError(
            'You need to log in, run the following command to continue: $ learnpack login',
          )
        Console.debug('No active session available', _private)
      }
    } catch (error: any) {
      Console.error(error.message)
    }
  }

  async buildConfig(flags: any) {
    this.configManager = await configManager(flags)
  }

  async catch(err: any) {
    Console.debug('COMMAND CATCH', err)
    throw err
  }
}

// SessionCommand.description = `Describe the command here
// ...
// Extra documentation goes here
// `
