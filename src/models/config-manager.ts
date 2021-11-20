import {IConfigObj, TGrading} from './config'
import {IExercise} from './exercise-obj'

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
  watchIndex: (onChange: (...args: any) => void) => void;
  save: () => void;
}
