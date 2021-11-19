import connect from 'socket.io'
import Console from '../utils/console'

export default {
  socket: null,
  config: null,
  allowedActions: null,
  actionCallBacks: {
    clean: (_: any, s: any) => {
      s.logs = []
    },
  },
  addAllowed: function (actions: any) {
    if (!Array.isArray(actions)) actions = [actions]

    // avoid adding the "test" action if grading is disabled
    if (
      actions.includes('test') &&
      this.config &&
      (this.config as any).disable_grading
    )
      actions = actions.filter((a: any) => a !== 'test')

    // remove duplicates
    /* this.allowedActions = this.allowedActions
      .filter((a) => !actions.includes(a))
      .concat(actions); */
    this.allowedActions = [
      ...(this.allowedActions || []).filter(a => !actions.includes(a)),
      ...actions,
    ] as any
  },
  removeAllowed: function (actions: any) {
    if (!Array.isArray(actions)) actions = [actions]
    this.allowedActions = (this.allowedActions || []).filter(
      a => !actions.includes(a),
    ) as any
  },
  start: function (config: any, server: any) {
    this.config = config

    // remove test action if grading is disabled
    this.allowedActions = config.actions.filter((act: any) =>
      config.disable_grading ? act !== 'test' : true,
    )

    this.socket = connect(server)

    if (this.socket) {
      (this.socket as any).on('connection', (socket: any) => {
        Console.debug(
          'Connection with client successfully established',
          this.allowedActions,
        )
        this.log('ready', ['Ready to compile or test...'])

        socket.on('compiler', ({action, data}: any) => {
          this.emit('clean', 'pending', ['Working...'])

          if (typeof data.exerciseSlug === 'undefined') {
            this.log('internal-error', ['No exercise slug specified'])
            Console.error('No exercise slug especified')
            return
          }

          if (
            this.actionCallBacks &&
            typeof (this.actionCallBacks as any)[action] === 'function'
          ) {
            (this.actionCallBacks as any)[action](data)
          } else {
            this.log('internal-error', ['Uknown action ' + action])
          }
        })
      })
    }
  },
  on: function (action: any, callBack: any) {
    if (this.actionCallBacks) {
      (this.actionCallBacks as any)[action] = callBack
    }
  },
  clean: function (_ = 'pending', logs = []) {
    this.emit('clean', 'pending', logs)
  },
  ask: function (questions = []) {
    return new Promise((resolve, _) => {
      this.emit('ask', 'pending', ['Waiting for input...'], questions)
      this.on('input', ({inputs}: any) => resolve(inputs))
    })
  },
  reload: function (files = null, exercises = null) {
    this.emit('reload', files, exercises)
  },

  log: function (
    status: any,
    messages: any = [],
    report: any = [],
    data: any = null,
  ) {
    this.emit('log', status, messages, [], report, data)
    Console.log(messages)
  },
  emit: function (
    action: any,
    status: any = 'ready',
    logs: any = [],
    inputs: any = [],
    report: any = [],
    data: any = null,
  ) {
    if (
      ['webpack', 'vanillajs', 'vue', 'react', 'css', 'html'].includes(
        (this.config as any)?.compiler,
      )
    ) {
      if (['compiler-success', 'compiler-warning'].includes(status))
        this.addAllowed('preview')
      if (['compiler-error'].includes(status) || action === 'ready')
        this.removeAllowed('preview')
    }

    if ((this.config as any)?.grading === 'incremental') {
      this.removeAllowed('reset')
    }

    (this.socket as any)?.emit('compiler', {
      action,
      status,
      logs,
      allowed: this.allowedActions,
      inputs,
      report,
      data,
    })
  },

  ready: function (message: any) {
    this.log('ready', [message])
  },
  success: function (type: any, stdout: string) {
    const types = ['compiler', 'testing']
    if (!types.includes(type))
      this.fatal(`Invalid socket success type "${type}" on socket`)
    else if (stdout === '')
      this.log(type + '-success', ['No stdout to display on the console'])
    else this.log(type + '-success', [stdout])
  },
  error: function (type: any, stdout: any) {
    console.error('Socket error: ' + type, stdout)
    this.log(type, [stdout])
  },
  fatal: function (msg: string) {
    this.log('internal-error', [msg])
    throw msg
  },
}
