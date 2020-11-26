#!/usr/bin/env node
import yargs = require('yargs/yargs');

yargs(process.argv.slice(2))
  .commandDir('cmds')
  .demandCommand()
  .help()
  .argv;
