import {IConfig} from './config'

export type TFile = string;

export interface IGitpodData {
  files: Array<TFile>;
}

export interface IGitpod {
  socket: any | null;
  config: IConfig | null;
  initialized: boolean;
  hasGPCommand: boolean;
  init: (config?: IConfig) => void;
  openFiles: (files: Array<TFile>) => Promise<boolean | undefined>;
  setup: (config?: IConfig) => void;
  autosave: (value: string) => void;
}
