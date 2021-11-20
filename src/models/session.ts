import {IConfig, IConfigObj} from './config'

export interface IValue {
  email: string;
}

export interface IStartProps {
  token: string;
  payload: any;
}

export interface ISession {
  sessionStarted: boolean;
  token: string | null;
  config: IConfig | null;
  currentCohort: null;
  initialize: () => Promise<boolean>;
  setPayload: (value: IValue) => Promise<boolean>;
  getPayload: () => Promise<any>;
  isActive: () => boolean;
  get: (config?: IConfigObj) => Promise<any>;
  login: () => Promise<void>;
  sync: () => Promise<void>;
  start: ({token, payload}: IStartProps) => Promise<void>;
  destroy: () => Promise<void>;
}
