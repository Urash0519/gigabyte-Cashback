import type { CampaignInput, CampaignConfiguration, ConfigurationIssue, Product, Retailer } from "@gigabyte-cashback/api-client";

export const PRODUCT_COLUMNS = ["id", "series", "category", "model", "ean", "cashbackMinor", "quantityLimit"] as const;
export const RETAILER_COLUMNS = ["id", "name", "country", "url", "validFrom", "validTo"] as const;
export const SUPPORTED_MARKETS = ["DE", "FR", "IT", "ES", "NL"];
export function effectiveCampaignRules(data: CampaignInput) {
  // Historic snapshots used legacy overrides. Display the same effective value
  // as the server until an explicit edit migrates it to the canonical field.
  return {
    maxClaimsPerHousehold: Number(data.legacyFields.maxClaimsPerHousehold ?? data.maxClaimsPerHousehold ?? 1),
    exclusivityGroup: data.legacyFields.exclusivityGroup ?? data.exclusivityGroup ?? "",
  };
}
// A reversible text escape prevents spreadsheet applications from executing cells.
// Literal leading apostrophes are doubled so the importer can distinguish them.
export function protectCsvCell(value: string) {
  return /^'|^[\t\r\n]|^\s*[=+@-]/.test(value) ? "'" + value : value;
}
export function restoreCsvCell(value: string) {
  return /^''|^'[\t\r\n]|^'\s*[=+@-]/.test(value) ? value.slice(1) : value;
}
export function utcInputValue(value: string | null) {
  return value && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString().slice(0, 16) : "";
}
export function configuration(data: CampaignInput): CampaignConfiguration {
  const copy = structuredClone(data);
  delete copy.concurrencyStamp;
  return { format: "gigabyte-cashback-campaign", schemaVersion: 1, data: copy };
}
export function parseConfiguration(raw: string): CampaignConfiguration {
  const value = JSON.parse(raw);
  if (value?.format !== "gigabyte-cashback-campaign" || value?.schemaVersion !== 1 || !value.data || typeof value.data !== "object" || Array.isArray(value.data)) throw new Error("Expected a gigabyte-cashback-campaign configuration with schemaVersion 1.");
  if (!Array.isArray(value.data.products) || !Array.isArray(value.data.retailers) || !Array.isArray(value.data.markets) || !Array.isArray(value.data.languages)) throw new Error("Configuration is missing products, retailers, markets or languages arrays.");
  return value;
}
export function configurationChanges(before: CampaignInput, after: CampaignInput) {
  const left = configuration(before).data, right = configuration(after).data;
  return Array.from(new Set([...Object.keys(left), ...Object.keys(right)])).filter(key => JSON.stringify(left[key as keyof CampaignInput]) !== JSON.stringify(right[key as keyof CampaignInput])).map(path => ({ path, before: left[path as keyof CampaignInput], after: right[path as keyof CampaignInput] }));
}
// RFC 4180 quoting, including embedded newlines and escaped quotes. Malformed input is rejected.
export function parseCsv(raw: string): string[][] {
  const text = raw.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [], field = "", quoted = false, closed = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { quoted = false; closed = true; }
      else field += c;
    } else if (c === '"') {
      if (field || closed) throw new Error(`Unexpected quote at character ${i + 1}.`);
      quoted = true;
    } else if (c === ",") { row.push(restoreCsvCell(field)); field = ""; closed = false; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(restoreCsvCell(field)); rows.push(row); row = []; field = ""; closed = false;
    } else {
      if (closed) throw new Error(`Unexpected text after closing quote at character ${i + 1}.`);
      field += c;
    }
  }
  if (quoted) throw new Error("Unclosed quoted CSV field.");
  if (field || row.length || closed) { row.push(restoreCsvCell(field)); rows.push(row); }
  return rows.filter(r => r.some(v => v.trim()));
}
export function csvText(columns: readonly string[], rows: Record<string, unknown>[]) {
  const cell = (value: unknown) => `"${protectCsvCell(String(value ?? "")).replaceAll('"', '""')}"`;
  return "\uFEFF" + [columns.map(cell).join(","), ...rows.map(row => columns.map(key => cell(row[key])).join(","))].join("\r\n");
}
export type CsvResult = { products: Product[]; retailers: Retailer[]; errors: ConfigurationIssue[]; sourceRows: string[][] };
export function importCsv(raw: string, kind: "products" | "retailers"): CsvResult {
  const result: CsvResult = { products: [], retailers: [], errors: [], sourceRows: [] };
  let rows: string[][];
  try { rows = parseCsv(raw); } catch (e) { result.errors.push({ path: "csv", message: String((e as Error).message) }); return result; }
  if (!rows.length) { result.errors.push({ path: "csv", message: "CSV is empty." }); return result; }
  result.sourceRows = rows;
  const headers = rows[0].map(h => h.trim()), columns: readonly string[] = kind === "products" ? PRODUCT_COLUMNS : RETAILER_COLUMNS;
  for (const header of headers) {
    if (!columns.includes(header)) result.errors.push({ path: "header", message: `Unknown column: ${header}` });
    if (headers.indexOf(header) !== headers.lastIndexOf(header)) result.errors.push({ path: "header", message: `Duplicate column: ${header}` });
  }
  for (const column of columns) if (!headers.includes(column)) result.errors.push({ path: "header", message: `Missing column: ${column}` });
  if (result.errors.length) return result;
  const ids = new Set<string>();
  rows.slice(1).forEach((values, index) => {
    const path = `row[${index + 2}]`;
    const error = (field: string, message: string) => result.errors.push({ path: `${path}.${field}`, message });
    const countBefore = result.errors.length;
    if (values.length !== headers.length) { error("", "Column count does not match header."); return; }
    const row = Object.fromEntries(headers.map((h, i) => [h, values[i]]));
    for (const key of ["id", "cashbackMinor", "quantityLimit", "country", "url", "validFrom", "validTo"]) if (key in row) row[key] = row[key].trim();
    const idKey = row.id.toLowerCase();
    if (!row.id) error("id", "ID is required.");
    if (ids.has(idKey)) error("id", `Duplicate ID: ${row.id}`);
    ids.add(idKey);
    if (kind === "products") {
      for (const key of ["model", "category"]) if (!row[key].trim()) error(key, "Required value.");
      for (const key of ["cashbackMinor", "quantityLimit"]) if (!/^\d+$/.test(row[key]) || !Number.isSafeInteger(Number(row[key])) || Number(row[key]) < (key === "quantityLimit" ? 1 : 0)) error(key, "Use a non-negative safe integer; quantity must be at least 1. Cashback is in cents (100 = EUR 1.00).");
      if (result.errors.length === countBefore) result.products.push({ id: row.id, series: row.series, category: row.category, model: row.model, ean: row.ean, cashbackMinor: Number(row.cashbackMinor), quantityLimit: Number(row.quantityLimit) });
    } else {
      if (!row.name.trim()) error("name", "Required value.");
      row.country = row.country.toUpperCase();
      if (!SUPPORTED_MARKETS.includes(row.country)) error("country", "Use DE, FR, IT, ES or NL.");
      if (row.url && !/^https?:\/\//i.test(row.url)) error("url", "Use an http or https URL.");
      for (const key of ["validFrom", "validTo"]) if (row[key] && (!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(row[key]) || !Number.isFinite(Date.parse(row[key])))) error(key, "Use a UTC/offset timestamp or leave blank.");
      if (row.validFrom && row.validTo && Date.parse(row.validFrom) > Date.parse(row.validTo)) error("validTo", "End must be on or after start.");
      if (result.errors.length === countBefore) result.retailers.push({ id: row.id, name: row.name, country: row.country, url: row.url, validFrom: row.validFrom || null, validTo: row.validTo || null });
    }
  });
  return result;
}
export function mergeRows<T extends { id: string }>(current: T[], incoming: T[], mode: "merge" | "replace"): T[] {
  if (mode === "replace") return incoming;
  const map = new Map(incoming.map(row => [row.id.toLowerCase(), row]));
  return [...current.map(row => map.get(row.id.toLowerCase()) ?? row), ...incoming.filter(row => !current.some(old => old.id.toLowerCase() === row.id.toLowerCase()))];
}
export function downloadText(name: string, body: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
