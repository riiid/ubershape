import type Yargs from 'yargs';

export type YargsArgv<TYargs> = TYargs extends Yargs.Argv<infer U> ? U : never;
export type ArgvFromBuilder<TBuilder extends (...args: any[]) => any> = YargsArgv<ReturnType<TBuilder>>;
export type Yargs = typeof Yargs;
