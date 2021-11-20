export interface IExercise {
  slug: string;
  path: string;
  done: boolean;
}

export interface IConfigPath {
  base: string;
}

export interface IEditor {
  mode: string;
  version: string;
}

export interface IConfig {
  address: string;
  dirPath: string;
  entries: any;
  grading: 'isolated' | 'grading' | 'no-grading';
  confPath: IConfigPath;
  configPath: string;
  translations: Array<string>;
  outputPath?: string;
  editor: IEditor;
  exercisesPath: string;
  actions: Array<any>;
  disable_grading?: boolean;
  runHook: (...agrs: Array<any>) => void;
}

export interface IConfigObj {
  config?: IConfig;
  exercises?: Array<IExercise>;
  grading?: 'isolated' | 'grading' | 'no-grading';
}
