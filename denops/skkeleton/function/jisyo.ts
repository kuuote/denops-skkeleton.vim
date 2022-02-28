import { config } from "../config.ts";
import { Context } from "../context.ts";
import { batch, fn, mapping, op, vars } from "../deps.ts";
import { currentContext } from "../main.ts";
import { HenkanState } from "../state.ts";
import { kakutei } from "./common.ts";

const cmapKeys = ["<Esc>", "<C-g>"];

export async function jisyoTouroku(context: Context): Promise<boolean> {
  const denops = context.denops!;
  await Promise.resolve();
  const state = context.state as HenkanState;
  const cmap = await Promise.all(
    cmapKeys.map(async (
      key,
    ) => ({
      key,
      map: await mapping.read(denops, key, { mode: "c" }).catch(() => {}),
    })),
  );
  await batch(denops, async (denops) => {
    for (const k of cmapKeys) {
      await mapping.map(denops, k, "<C-c>", {
        buffer: true,
        mode: "c",
      });
    }
  });
  try {
    const base = "[辞書登録] " + state.henkanFeed;
    const okuri = state.mode === "okuriari" ? "*" + state.okuriFeed : "";
    currentContext.init().denops = denops;
    const input = await fn.input(denops, base + okuri + ": ");
    if (!input) {
      return false;
    }
    state.candidates = [input];
    state.candidateIndex = 0;
    await kakutei(context);
    return true;
  } catch (e) {
    if (config.debug) {
      console.log("jisyo touroku interrupted");
      console.log(e);
    }
  } finally {
    await batch(denops, async (denops) => {
      // restore mapping
      for (const m of cmap) {
        if (m.map?.buffer) {
          await mapping.map(denops, m.map.lhs, m.map.rhs, m.map);
        } else {
          // await mapping.unmap(denops, m.map.lhs);
          await denops.cmd(`cunmap <buffer> ${m.key}`);
        }
      }
      // restore skkeleton mode
      await op.iminsert.setLocal(denops, 1);
      await denops.call("skkeleton#map");
      await vars.g.set(denops, "skkeleton#enabled", true);
      await denops.cmd("redrawstatus");
    });
    // restore stashed context
    currentContext.set(context);
  }
  return false;
}
