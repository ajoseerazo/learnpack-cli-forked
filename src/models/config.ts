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

export type TCompiler =
  | 'webpack'
  | 'vanillajs'
  | 'vue'
  | 'react'
  | 'css'
  | 'html';

export type TGrading = 'isolated' | 'incremental' | 'no-grading';

export interface IConfig {
  port?: string;
  address: string;
  dirPath: string;
  entries: any;
  grading: TGrading;
  confPath: IConfigPath;
  configPath: string;
  translations: Array<string>;
  outputPath?: string;
  editor: IEditor;
  exercisesPath: string;
  actions: Array<any>;
  disable_grading?: boolean;
  compiler: TCompiler;
  runHook: (...agrs: Array<any>) => void;
}

export type TConfigObjAttributes = 'config' | 'exercises' | 'grading';

export interface IConfigObj {
  config?: IConfig;
  exercises?: Array<IExercise>;
  grading?: TGrading;
}
