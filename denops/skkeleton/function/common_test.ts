import { config } from "../config.ts";
import { Context } from "../context.ts";
import { assertEquals } from "../deps/std/testing.ts";
import { currentLibrary } from "../jisyo.ts";
import { cancel, kakutei } from "./common.ts";
import { dispatch } from "./testutil.ts";

const lib = currentLibrary.get();

lib.registerCandidate("okurinasi", "あ", "い");
lib.registerCandidate("okurinasi", "ちゅうしゃく", "注釈;これは注釈です");

Deno.test({
  name: "input cancel",
  async fn() {
    const context = new Context();
    await dispatch(context, "A");
    cancel(context);
    assertEquals(context.toString(), "");
    await dispatch(context, "A ");
    cancel(context);
    assertEquals(context.toString(), "");

    config.immediatelyCancel = false;
    await dispatch(context, "A ");
    cancel(context);
    assertEquals(context.toString(), "▽あ");
    cancel(context);
    assertEquals(context.toString(), "");
  },
});

Deno.test({
  name: "annotation",
  async fn() {
    const context = new Context();
    await dispatch(context, ";tyuusyaku ");
    kakutei(context);
    assertEquals("注釈", context.preEdit.output(""));
    assertEquals(["注釈;これは注釈です"], lib.getCandidate("okurinasi", "ちゅうしゃく"));
  },
});
