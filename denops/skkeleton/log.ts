import { Denops } from "./deps.ts";

class Logger {
  denops?: Denops;
  setup(denops: Denops) {
    this.denops = denops;
  }
  async printError() {

  }
}
