import {IFile} from './file'

export interface IExercise {
  position?: number;
  files: Array<IFile>;
  slug: string;
  path: string;
  done: boolean;
  language?: string | null;
  entry?: string | null;
  graded?: boolean;
  translations?: { [key: string]: string };
  title?: string;
  getReadme: (lang: string | null) => any;
  getFile: (name: string) => string | Buffer;
  saveFile: (name: string, content: string) => void;
  getTestReport: () => any;
}
