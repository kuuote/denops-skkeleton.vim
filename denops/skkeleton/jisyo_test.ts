import { dirname, fromFileUrl, join } from "./deps/std/path.ts";
import { assertEquals, assertNotEquals } from "./deps/std/testing.ts";
import {
  decodeJisyo,
  encodeJisyo,
  ensureJisyo,
  Library,
  load,
  loadJisyo,
  RemoteJisyo,
} from "./jisyo.ts";

const globalJisyo = join(
  dirname(fromFileUrl(import.meta.url)),
  "testdata",
  "globalJisyo",
);

const userJisyo = join(
  dirname(fromFileUrl(import.meta.url)),
  "testdata",
  "userJisyo",
);

Deno.test({
  name: "remote jisyo",
  async fn() {
    const remoteJisyo = new RemoteJisyo();
    try {
      await remoteJisyo.connect({ port: 1178 });
    } catch (e) {
      console.log("failed connecting to skkserv");
      console.log(e);
      return;
    }
    assertEquals(await remoteJisyo.getCandidate("ai"), ["AI", "人工知能"]);
    assertNotEquals(await remoteJisyo.getCandidates("abs"), []);
    remoteJisyo.close();
  },
});

Deno.test({
  name: "load jisyo",
  async fn() {
    const jisyo = await loadJisyo(globalJisyo, "euc-jp");
    ensureJisyo(jisyo);
    const data =
      '{"okuriari":{"てすt":["テスト"]},"okurinasi":{"てすと":["テスト","test"]}}';
    assertEquals(JSON.stringify(jisyo), data);
  },
});

Deno.test({
  name: "get candidates",
  async fn() {
    const jisyo = await loadJisyo(globalJisyo, "euc-jp");
    const manager = new Library(jisyo);
    const ari = await manager.getCandidate("okuriari", "てすt");
    assertEquals(["テスト"], ari);
    const nasi = await manager.getCandidate("okurinasi", "てすと");
    assertEquals(["テスト", "test"], nasi);
  },
});

Deno.test({
  name: "register candidate",
  async fn() {
    const manager = new Library();
    // most recently registered
    manager.registerCandidate("okurinasi", "test", "a");
    manager.registerCandidate("okurinasi", "test", "b");
    assertEquals(["b", "a"], await manager.getCandidate("okurinasi", "test"));
    // and remove duplicate
    manager.registerCandidate("okurinasi", "test", "a");
    assertEquals(["a", "b"], await manager.getCandidate("okurinasi", "test"));
  },
});

Deno.test({
  name: "global/local jisyo interop",
  async fn() {
    const jisyo = await loadJisyo(globalJisyo, "euc-jp");
    const library = new Library(jisyo);
    library.registerCandidate("okurinasi", "てすと", "test");

    // remove dup
    const nasi = await library.getCandidate("okurinasi", "てすと");
    assertEquals(["test", "テスト"], nasi);

    // new candidate
    // user candidates priority is higher than global
    library.registerCandidate("okurinasi", "てすと", "てすと");
    const nasi2 = await library.getCandidate("okurinasi", "てすと");
    assertEquals(["てすと", "test", "テスト"], nasi2);
  },
});

Deno.test({
  name: "encode/decode skk jisyo",
  async fn() {
    const data = new TextDecoder("euc-jp").decode(
      await Deno.readFile(globalJisyo),
    );
    const jisyo = decodeJisyo(data);
    const redata = encodeJisyo(jisyo);
    assertEquals(redata, data);
  },
});

Deno.test({
  name: "read/write skk jisyo",
  async fn() {
    const tmp = await Deno.makeTempFile();
    try {
      const library = await load("", tmp);
      await Deno.writeTextFile(
        tmp,
        `
;; okuri-ari entries.
;; okuri-nasi entries.
あ /あ/
      `,
      );

      // load
      await library.loadJisyo();
      assertEquals(await library.getCandidate("okurinasi", "あ"), ["あ"]);

      //save
      library.registerCandidate("okurinasi", "あ", "亜");
      await library.saveJisyo();
      const data = await Deno.readTextFile(tmp);
      const line = data.split("\n").find((value) => value.startsWith("あ"));
      assertEquals(line, "あ /亜/あ/");
    } finally {
      await Deno.remove(tmp);
    }
  },
});

Deno.test({
  name: "don't register empty candidate",
  async fn() {
    const tmp = await Deno.makeTempFile();
    try {
      const lib = new Library(undefined, undefined, tmp);
      lib.registerCandidate("okurinasi", "ほげ", "");
      lib.registerCandidate("okuriari", "ほげ", "");
      await lib.saveJisyo();
      assertEquals(
        (await Deno.readTextFile(tmp)).indexOf("ほげ"),
        -1,
      );
    } finally {
      await Deno.remove(tmp);
    }
  },
});

Deno.test({
  name: "Bulk load jisyo",
  async fn() {
    const library = await load(globalJisyo, userJisyo, "euc-jp");
    const global = await library.getCandidate("okurinasi", "てすと");
    assertEquals(["テスト", "test"], global);
    const user = await library.getCandidate("okurinasi", "ユーザー辞書");
    assertEquals(["ほげ"], user);
  },
});
