import { Command } from "https://deno.land/x/cliffy@v0.18.0/command/mod.ts";

const command = new Command();
command
  .name("ubershape")
  .arguments("<command> [options]")
  .action(() => command.showHelp())
  .command("codegen", (await import("./cmds/codegen.ts")).default)
  .command("validate", (await import("./cmds/validate.ts")).default)
  .parse(Deno.args);
