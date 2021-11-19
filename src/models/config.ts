export interface IConfig {
  address: string;
  grading: 'isolated' | 'grading' | 'no-grading';
  runHook: (...agrs: Array<any>) => void;
}
