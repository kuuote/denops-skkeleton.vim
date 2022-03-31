import { Context } from "./context.ts";
import { cancel, kakutei, newline } from "./function/common.ts";
import { disable, escape } from "./function/disable.ts";
import {
  henkanBackward,
  henkanFirst,
  henkanForward,
  henkanInput,
  purgeCandidate,
} from "./function/henkan.ts";
import { deleteChar, henkanPoint, kakuteiFeed } from "./function/input.ts";
import { hankatakana, katakana, zenkaku } from "./function/mode.ts";
import { Cell } from "./util.ts";

export type Func = (
  context: Context,
  char: string,
) => void | Promise<void>;

export const functions = new Cell<Record<string, Func>>(() => ({
  // common
  kakutei,
  newline,
  cancel,
  // disable
  disable,
  escape,
  // henkan
  henkanFirst,
  henkanForward,
  henkanBackward,
  purgeCandidate,
  henkanInput,
  // input
  kakuteiFeed,
  henkanPoint,
  deleteChar,
  // mode
  katakana,
  hankatakana,
  zenkaku,
}));
