const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "..", "content.js"), "utf8");

function createContext(scriptData = null) {
  const payload = scriptData ? JSON.stringify({ payload: scriptData }) : "";
  const document = {
    querySelector(selector) {
      if (selector === 'script[data-target="react-app.embeddedData"]' && scriptData) {
        return { textContent: payload };
      }
      return null;
    },
    querySelectorAll() { return []; },
  };
  const context = {
    document,
    location: { pathname: "/example/repo/blob/main/src/example.js" },
    chrome: { runtime: { onMessage: { addListener() {} } } },
    decodeURI,
    decodeURIComponent,
    encodeURIComponent,
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return context;
}

test("parses ordinary GitHub file URLs", () => {
  const ctx = createContext();
  const result = ctx.parseGitHubUrl("/owner/repo/blob/main/src/index.js", null);
  assert.equal(result.repo_name, "owner/repo");
  assert.equal(result.file_path, "src/index.js");
});

test("uses embedded metadata for branch refs containing slashes", () => {
  const ctx = createContext();
  const result = ctx.parseGitHubUrl(
    "/owner/repo/blob/feature/new-ui/src/index.js",
    { path: "src/index.js", refInfo: { name: "feature/new-ui" } },
  );
  assert.equal(result.file_path, "src/index.js");
});

test("prefers source lines to rendered markdown", () => {
  const ctx = createContext({ blob: { rawLines: ["# Header", "console.log(1);"] } });
  assert.equal(ctx.readCode(), "# Header\nconsole.log(1);");
});

test("rejects non-file paths", () => {
  const ctx = createContext();
  assert.equal(ctx.parseGitHubUrl("/owner/repo/tree/main", null), null);
});

test("returns a helpful error for oversized files", () => {
  const ctx = createContext({ blob: { rawLines: ["x".repeat(60001)] }, path: "src/example.js", refInfo: { name: "main" } });
  let reply;
  ctx.chrome.runtime.onMessage.addListener = handler => {
    ctx.handler = handler;
  };
  vm.runInContext(source, ctx);
  ctx.handler({type:"GET_FILE"}, null, answer => reply = answer);
  assert.match(reply.error, /too large/);
});
