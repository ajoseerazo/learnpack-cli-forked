export interface IConfigPath {
  base: string;
}

export interface IConfig {
  address: string;
  dirPath: string;
  entries: any;
  grading: 'isolated' | 'grading' | 'no-grading';
  confPath: IConfigPath;
  runHook: (...agrs: Array<any>) => void;
}

export interface IConfigObj {
  config: IConfig;
  exercises: any;
}
