import {Server, Socket} from 'socket.io'
import Console from '../utils/console'

// import {IExercise} from '../models/exercise'
import {ISocket} from '../models/socket'
import {IConfig} from '../models/config'
import {ICallback, TAction} from '../models/action'
import {IExercise} from '../models/exercise'
import {TStatus} from '../models/status'
import {TSuccessType} from '../models/success-types'
import * as http from 'http'

const SocketManager: ISocket = {
  socket: null,
  config: null,
  allowedActions: null,
  actionCallBacks: {
    clean: (_, s: { logs: Array<string> }) => {
      s.logs = []
    },
  },
  addAllowed: function (actions: Array<TAction> | TAction) {
    if (!Array.isArray(actions))
      actions = [actions]

    // avoid adding the "test" action if grading is disabled
    if (actions.includes('test') && this.config?.disable_grading) {
      actions = actions.filter((a: TAction) => a !== 'test')
    }

    // remove duplicates
    /* this.allowedActions = this.allowedActions
      .filter((a) => !actions.includes(a))
      .concat(actions); */
    this.allowedActions = [
      ...(this.allowedActions || []).filter(
        (a: TAction) => !actions.includes(a),
      ),
      ...actions,
    ]
  },
  removeAllowed: function (actions: Array<TAction> | TAction) {
    if (!Array.isArray(actions)) {
      actions = [actions]
    }

    this.allowedActions = (this.allowedActions || []).filter(
      (a: TAction) => !actions.includes(a),
    )
  },
  start: function (config: IConfig, server: http.Server) {
    this.config = config

    // remove test action if grading is disabled
    this.allowedActions = config.actions.filter((act: TAction) =>
      config.disable_grading ? act !== 'test' : true,
    )

    this.socket = new Server(server)

    if (this.socket) {
      this.socket.on('connection', (socket: Socket) => {
        Console.debug(
          'Connection with client successfully established',
          this.allowedActions,
        )
        this.log('ready', ['Ready to compile or test...'])

        socket.on(
          'compiler',
          ({action, data}: { action: string; data: IExercise }) => {
            this.emit('clean', 'pending', ['Working...'])

            if (typeof data.exerciseSlug === 'undefined') {
              this.log('internal-error', ['No exercise slug specified'])
              Console.error('No exercise slug especified')
              return
            }

            if (
              this.actionCallBacks &&
              typeof this.actionCallBacks[action] === 'function'
            ) {
              this.actionCallBacks[action](data)
            } else {
              this.log('internal-error', ['Uknown action ' + action])
            }
          },
        )
      })
    }
  },
  on: function (action: TAction, callBack: ICallback) {
    if (this.actionCallBacks) {
      this.actionCallBacks[action] = callBack
    }
  },
  clean: function (_ = 'pending', logs = []) {
    this.emit('clean', 'pending', logs)
  },
  ask: function (questions = []) {
    return new Promise((resolve, _) => {
      this.emit('ask', 'pending', ['Waiting for input...'], questions)
      this.on('input', ({inputs}: { inputs: string }) => resolve(inputs))
    })
  },
  reload: function (files: Array<string> | null, exercises: Array<string>) {
    this.emit(
      'reload',
      files?.join('') || '' /* TODO: Check it out this */,
      exercises,
    )
  },
  log: function (
    status: TStatus,
    messages: string | Array<string> = [],
    report: Array<string> = [],
    data: any = null,
  ) {
    this.emit('log', status, messages, [], report, data)
    Console.log(messages)
  },
  emit: function (
    action: TAction,
    status: TStatus | string = 'ready',
    logs: string | Array<string> = [],
    inputs: Array<string> = [],
    report: Array<string> = [],
    data: any = null,
  ) {
    if (
      this.config?.compiler &&
      ['webpack', 'vanillajs', 'vue', 'react', 'css', 'html'].includes(
        this.config?.compiler,
      )
    ) {
      if (['compiler-success', 'compiler-warning'].includes(status))
        this.addAllowed('preview')
      if (['compiler-error'].includes(status) || action === 'ready')
        this.removeAllowed('preview')
    }

    if (this.config?.grading === 'incremental') {
      this.removeAllowed('reset')
    }

    this.socket?.emit('compiler', {
      action,
      status,
      logs,
      allowed: this.allowedActions,
      inputs,
      report,
      data,
    })
  },

  ready: function (message: string) {
    this.log('ready', [message])
  },
  success: function (type: TSuccessType, stdout: string) {
    const types = ['compiler', 'testing']
    if (!types.includes(type))
      this.fatal(`Invalid socket success type "${type}" on socket`)
    else if (stdout === '')
      this.log((type + '-success') as TSuccessType, [
        'No stdout to display on the console',
      ])
    else
      this.log((type + '-success') as TSuccessType, [stdout])
  },
  error: function (type: TStatus, stdout: string) {
    console.error('Socket error: ' + type, stdout)
    this.log(type, [stdout])
  },
  fatal: function (msg: string) {
    this.log('internal-error', [msg])
    throw msg
  },
}

export default SocketManager
