import {IConfig} from '../models/config'
import {IExercise} from '../models/exercise'
import {Server} from 'socket.io'
import {DefaultEventsMap} from 'socket.io/dist/typed-events'

export interface ISocket {
  socket: Server<
    DefaultEventsMap,
    DefaultEventsMap,
    DefaultEventsMap,
    any
  > | null;
  config: IConfig | null;
  allowedActions: Array<string> | null;
  actionCallBacks: any;
  addAllowed: (actions: any) => void;
  removeAllowed: (actions: any) => void;
  start: (config: IConfig, server: any) => void;
  on: (action: any, callBack: any) => void;
  clean: (_: string, logs: Array<any>) => void;
  ask: (questions: Array<string>) => void;
  reload: (files: Array<string> | null, exercises: Array<string>) => void;
  log: (
    status: string,
    messages: string | Array<string>,
    report?: Array<any>,
    data?: any
  ) => void;
  emit: (
    action: any,
    status: string,
    logs: string | Array<string>,
    inputs?: Array<any>,
    report?: Array<any>,
    data?: any
  ) => void;
  ready: (message: string) => void;
  error: (type: any, stdout: string) => void;
  fatal: (msg: string) => void;
  success: (type: any, stdout: string) => void;
}
