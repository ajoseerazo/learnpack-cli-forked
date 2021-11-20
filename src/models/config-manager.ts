import {IConfigObj, IExercise, TGrading} from './config'

export interface IConfigManagerAttributes {
  grading: TGrading;
  disableGrading: boolean;
  version: string;
}

export interface IConfigManager {
  get: () => IConfigObj;
  clean: () => void;
  getExercise: (slug: string) => IExercise;
  reset: (slug: string) => void;
  buildIndex: () => boolean | void;
  watchIndex: (onChange: () => void) => void;
  save: () => void;
}
