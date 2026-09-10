import test from "node:test";
import assert from "node:assert/strict";
import { effectiveCampaignRules } from "../src/campaign-transfer.ts";
import { parseCsv, csvText, importCsv, mergeRows, configuration, configurationChanges, parseConfiguration, utcInputValue, PRODUCT_COLUMNS, RETAILER_COLUMNS } from "../src/campaign-transfer.ts";

const product = { id: "00123", series: 'AORUS, "Elite"\nSeries', category: "Motherboard", model: "Z890 ELITE", ean: "0004719331234", cashbackMinor: 1250, quantityLimit: 1 };
const retailer = { id: "DE-01", name: "A, B", country: "DE", url: "https://example.com", validFrom: "2026-01-01T00:00:00Z", validTo: null };
test("historic legacy rules display the server-effective values until explicitly migrated", () => {
  const old = { maxClaimsPerHousehold: 1, exclusivityGroup: "", legacyFields: { maxClaimsPerHousehold: "3", exclusivityGroup: "old-group" } };
  assert.deepEqual(effectiveCampaignRules(old), { maxClaimsPerHousehold: 3, exclusivityGroup: "old-group" });
  assert.deepEqual(effectiveCampaignRules({ ...old, maxClaimsPerHousehold: 2, exclusivityGroup: "new-group", legacyFields: {} }), { maxClaimsPerHousehold: 2, exclusivityGroup: "new-group" });
});

test("quoted CSV preserves embedded commas, escaped quotes, multiline cells and textual IDs", () => {
  const result = importCsv(csvText(PRODUCT_COLUMNS, [product]), "products");
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.products, [product]);
});
test("CRLF, LF, BOM and empty trailing lines parse consistently", () => {
  assert.deepEqual(parseCsv('\uFEFFid,name\r\na,"one\ntwo"\r\n\r\n'), [["id", "name"], ["a", "one\ntwo"]]);
  assert.deepEqual(parseCsv("a,b\n1,2\n"), [["a", "b"], ["1", "2"]]);
});
test("malformed quoting rejects input without applying rows", () => {
  for (const raw of ['a,"unclosed', 'a,b"bad"', 'a,"ok"bad']) assert.throws(() => parseCsv(raw));
  assert.equal(importCsv('a,"unclosed', "products").products.length, 0);
});
test("spreadsheet formula escapes round-trip including literal apostrophes and whitespace", () => {
  const values = ["=1+1", "+cmd", "-cmd", "@SUM(A1:A2)", "  =1+1", "\t=1+1", "\r=1+1", "\n=1+1", "'literal", "'=literal", "''literal", 'normal, "quoted"\ntext'];
  const exported = csvText(["value"], values.map(value => ({ value })));
  assert.ok(exported.includes('"\'=1+1"'));
  assert.ok(exported.includes('"\'\'=literal"'));
  assert.deepEqual(parseCsv(exported).slice(1).map(row => row[0]), values);
  for (const model of values) assert.equal(importCsv(csvText(PRODUCT_COLUMNS, [{ ...product, model }]), "products").products[0].model, model);
});
test("date editors display imported timestamps in UTC, not their original offset", () => {
  assert.equal(utcInputValue("2026-01-01T00:00:00+01:00"), "2025-12-31T23:00");
  assert.equal(utcInputValue(null), "");
});
test("unknown, duplicate and missing headers reject the entire import", () => {
  for (const header of ["id,unknown", "id,id", "id"]) {
    const result = importCsv(header + "\nx,y", "products");
    assert.ok(result.errors.length);
    assert.deepEqual(result.products, []);
  }
});
test("duplicate product IDs are case-insensitive and report source row", () => {
  const result = importCsv(csvText(PRODUCT_COLUMNS, [product, { ...product, id: product.id }]), "products");
  assert.equal(result.errors[0].path, "row[3].id");
  assert.equal(result.sourceRows[2][0], product.id);
});
test("cashback uses integer cents with no floating point rounding or scientific notation", () => {
  for (const cashbackMinor of ["12.50", "1e3", "-1", "9007199254740992", ""]) {
    assert.ok(importCsv(csvText(PRODUCT_COLUMNS, [{ ...product, cashbackMinor }]), "products").errors.some(e => e.path.endsWith("cashbackMinor")));
  }
  assert.ok(importCsv(csvText(PRODUCT_COLUMNS, [{ ...product, quantityLimit: 0 }]), "products").errors.some(e => e.path.endsWith("quantityLimit")));
});
test("retailer CSV preserves null validity and validates country and dates", () => {
  assert.deepEqual(importCsv(csvText(RETAILER_COLUMNS, [retailer]), "retailers").retailers, [retailer]);
  for (const invalid of [{ country: "UK" }, { validTo: "2025-01-01T00:00:00Z" }, { validFrom: "yesterday" }, { url: "javascript:alert(1)" }]) {
    assert.ok(importCsv(csvText(RETAILER_COLUMNS, [{ ...retailer, ...invalid }]), "retailers").errors.length);
  }
});
test("merge replaces matching IDs without dropping other products; replace is explicit", () => {
  const original = [{ ...product, id: "SKU-A" }, { ...product, id: "SKU-B" }];
  const incoming = [{ ...product, id: "sku-a", cashbackMinor: 2000 }, { ...product, id: "SKU-C" }];
  assert.deepEqual(mergeRows(original, incoming, "merge").map(p => [p.id, p.cashbackMinor]), [["sku-a", 2000], ["SKU-B", 1250], ["SKU-C", 1250]]);
  assert.deepEqual(mergeRows(original, incoming, "replace"), incoming);
  assert.equal(original[0].cashbackMinor, 1250);
});
test("configuration export preserves all data but strips concurrency token without mutating editor", () => {
  const source = { concurrencyStamp: "private-lock", products: [product], retailers: [retailer], markets: ["DE"], languages: ["en"], maxClaimsPerHousehold: 1, exclusivityGroup: "Q1", terms: "Terms\nline2", legacyFields: { custom: "preserve me" } };
  const exported = configuration(source);
  assert.equal(exported.data.concurrencyStamp, undefined);
  assert.equal(source.concurrencyStamp, "private-lock");
  assert.deepEqual(parseConfiguration(JSON.stringify(exported)), exported);
  assert.deepEqual(configurationChanges(source, { ...source, concurrencyStamp: "new-lock" }), []);
  assert.deepEqual(configurationChanges(source, { ...source, terms: "changed" }).map(d => d.path), ["terms"]);
});
test("configuration parser rejects incompatible formats and missing arrays", () => {
  for (const value of [null, {}, { format: "gigabyte-cashback-campaign", schemaVersion: 2, data: {} }, { format: "gigabyte-cashback-campaign", schemaVersion: 1, data: {} }]) assert.throws(() => parseConfiguration(JSON.stringify(value)));
});
