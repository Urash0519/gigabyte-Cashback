import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { createState, freshDraft } from "../app/prototype-model.ts";

const source = await readFile(new URL("../app/prototype-v3.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText.replaceAll('"./prototype-model"', '"../app/prototype-model.ts"');
await mkdir(new URL("../.uat-test/", import.meta.url), { recursive: true });
const output = new URL("../.uat-test/prototype-v3.mjs", import.meta.url);
await writeFile(output, compiled);
const surfaces = await import(output.href);
const props = { state: createState(), act: () => true, market: "DE", setView() {}, search: "" };
const html = (Component, p = props) => renderToStaticMarkup(React.createElement(Component, p));

test("root retains v1 visual structure with explicit v3 / UAT scope", () => {
  const page = html(surfaces.CashbackPrototypeV3);
  for (const text of ["PROTOTYPE 03", "Internal acceptance only", "Build more.", "Get more back.", "Germany", "France", "Italy", "Spain", "Netherlands", "hero-art", "campaign-visual", "Reset demo"]) assert.ok(page.includes(text), text);
  assert.doesNotMatch(page, /Building your site|Your site is taking shape|AI PC Creator Cashback|WATERFORCE/);
});
test("all core surfaces render without runtime failures", () => {
  for (const name of ["CampaignPage", "ClaimFormV3", "MyClaims", "ClaimReview", "Payments", "Campaigns", "Reports", "Audit"]) {
    const rendered = html(surfaces[name]); assert.ok(rendered.length > 400, name);
    assert.doesNotMatch(rendered, /undefined|null product/i);
  }
});
test("multi-product editor and review do not claim live API validation", () => {
  const editor = html(surfaces.ProductInputs, { draft: freshDraft(), setDraft() {}, campaign: props.state.campaigns[0] });
  assert.match(editor, /Add another product/); assert.match(editor, /registered-product list/);
  const review = html(surfaces.ClaimReview);
  assert.match(review, /Manual checks/); assert.match(review, /not connected/);
  assert.doesNotMatch(review, /Verified by product API|Invoice confidence|OCR complete/);
});
test("metadata is UAT-specific and asset paths are portable", async () => {
  const index = await readFile(new URL("../pages/index.html", import.meta.url), "utf8");
  assert.match(index, /Prototype 03/); assert.match(index, /noindex/); assert.match(index, /%BASE_URL%favicon.svg/);
});
