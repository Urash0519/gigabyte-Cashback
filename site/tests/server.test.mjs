import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, unlink, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { createUatServer } from "../server.mjs";

test("Cloud Run server serves UI and health, rejects writes and private paths", async () => {
  const root = await mkdtemp(join(tmpdir(), "cashback-uat-test-"));
  await writeFile(join(root, "index.html"), "<!doctype html><title>Prototype 03</title>");
  await writeFile(join(root, "app.js"), "export const uat=true;");
  const server = createUatServer(root);
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const base = "http://127.0.0.1:" + server.address().port;
  try {
    const health = await fetch(base + "/health"); assert.equal(health.status, 200); const healthBody = await health.json(); assert.equal(healthBody.mode, "internal-uat"); assert.equal(healthBody.version, "3.0.0");
    const page = await fetch(base + "/"); assert.equal(page.status, 200); assert.match(await page.text(), /Prototype 03/);
    assert.match(page.headers.get("content-security-policy"), /frame-ancestors 'none'/); assert.match(page.headers.get("x-robots-tag"), /noindex/);
    const asset = await fetch(base + "/app.js"); assert.match(asset.headers.get("content-type"), /javascript/);
    const head = await fetch(base + "/", { method: "HEAD" }); assert.equal(await head.text(), "");
    assert.equal((await fetch(base + "/my-claims")).status, 200);
    for (const path of ["/.env", "/api/members", "/missing.js", "/%2Eenv"]) assert.equal((await fetch(base + path)).status, 404);
    assert.equal((await fetch(base + "/", { method: "POST", body: "not accepted" })).status, 405);
  } finally {
    await new Promise(resolve => server.close(resolve));
    await unlink(join(root, "index.html")); await unlink(join(root, "app.js")); await rmdir(root);
  }
});
