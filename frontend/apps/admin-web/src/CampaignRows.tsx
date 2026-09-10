import { useState } from "react";
import { configurationApi, markets, type CampaignInput, type CampaignCatalog, type Product, type Retailer } from "@gigabyte-cashback/api-client";
import { PRODUCT_COLUMNS, RETAILER_COLUMNS, importCsv, csvText, downloadText, mergeRows, utcInputValue, type CsvResult } from "./campaign-transfer";
import { useLocale } from "./i18n";

type Kind = "products" | "retailers";
type Row = Product | Retailer;
const labels: Record<string, string> = { id: "ID", series: "Series", category: "Category", model: "Model", ean: "EAN", cashbackMinor: "Cashback cents (100 = EUR 1.00)", quantityLimit: "Quantity limit", name: "Name", country: "Country", url: "URL", validFrom: "Valid from (UTC)", validTo: "Valid until (UTC)" };
export function CampaignRows({ kind, draft, onChange }: { kind: Kind; draft: CampaignInput; onChange: (data: CampaignInput) => void }) {
  const { t } = useLocale();
  const rows: Row[] = draft[kind];
  const columns = kind === "products" ? PRODUCT_COLUMNS : RETAILER_COLUMNS;
  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [bulkKey, setBulkKey] = useState(kind === "products" ? "cashbackMinor" : "country");
  const [bulkValue, setBulkValue] = useState("");
  const [csv, setCsv] = useState<CsvResult | null>(null);
  const [csvMode, setCsvMode] = useState<"merge" | "replace">("merge");
  const [error, setError] = useState("");
  const [catalog, setCatalog] = useState<CampaignCatalog | null>(null);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogGroup, setCatalogGroup] = useState("");
  const [catalogCategory, setCatalogCategory] = useState("");
  const [catalogSelected, setCatalogSelected] = useState<string[]>([]);
  const [updateMetadata, setUpdateMetadata] = useState(false);
  const [catalogBusy, setCatalogBusy] = useState(false);
  const [masterGroup, setMasterGroup] = useState("");
  const [masterReason, setMasterReason] = useState("");
  const [replaceMaster, setReplaceMaster] = useState(false);
  const [notice, setNotice] = useState("");
  const record = (row: Row) => row as unknown as Record<string, string | number | null>;
  const groupOf = (row: Row) => kind === "products" ? (row as Product).category : (row as Retailer).country;
  const filtered = rows.map((row, index) => ({ row, index })).filter(({ row }) => (!groupFilter || groupOf(row) === groupFilter) && Object.values(row).join(" ").toLowerCase().includes(query.toLowerCase()));
  const allFiltered = filtered.length > 0 && filtered.every(({ index }) => selected.includes(index));
  function change(next: Row[]) { onChange({ ...draft, [kind]: next }); }
  function setCell(index: number, key: string, value: string) {
    let next: string | number | null = value;
    if (key === "cashbackMinor" || key === "quantityLimit") next = value === "" ? 0 : Number(value);
    if (key === "validFrom" || key === "validTo") next = value ? value + ":00Z" : null;
    change(rows.map((row, i) => i === index ? { ...row, [key]: next } : row));
  }
  function applyBulk() {
    setError("");
    if (!selected.length) return;
    if ((bulkKey === "cashbackMinor" || bulkKey === "quantityLimit") && (!/^\d+$/.test(bulkValue) || !Number.isSafeInteger(Number(bulkValue)) || Number(bulkValue) < (bulkKey === "quantityLimit" ? 1 : 0))) { setError(t("Use integer cents; quantity must be at least 1.")); return; }
    if (bulkKey === "country" && !markets.includes(bulkValue)) { setError(t("Choose one of the five supported countries.")); return; }
    if ((bulkKey === "category" || bulkKey === "series") && !bulkValue.trim()) { setError(t("Enter a bulk value.")); return; }
    const value = bulkKey === "cashbackMinor" || bulkKey === "quantityLimit" ? Number(bulkValue) : bulkKey === "validFrom" || bulkKey === "validTo" ? (bulkValue ? bulkValue + ":00Z" : null) : bulkValue;
    change(rows.map((row, i) => selected.includes(i) ? { ...row, [bulkKey]: value } : row));
    setNotice(t("Applied to {count} selected rows in the editor. Save draft to persist.", { count: selected.length }));
  }
  const incoming: Row[] = csv ? csv[kind] : [];
  const csvMatches = incoming.filter(row => rows.some(old => old.id.toLowerCase() === row.id.toLowerCase())).length;
  const masterRows = catalog ? catalog[kind] : [];
  const filteredCatalog = masterRows.filter(row => (!catalogGroup || row.group === catalogGroup) && (!catalogCategory || ("category" in row ? row.category : row.country) === catalogCategory) && Object.values(row).join(" ").toLowerCase().includes(catalogQuery.toLowerCase()));
  const selectedMaster = masterRows.filter(row => catalogSelected.includes(row.id));
  return <section className="campaign-rows">
    <p className="muted">{kind === "products" ? t("Product amounts are integer EUR cents: 1250 = EUR 12.50. CSV headers are fixed; IDs and EANs remain text.") : t("Retailers are limited to DE, FR, IT, ES and NL. Validity timestamps use UTC; blank means unrestricted.")}</p>
    <div className="toolbar">
      <input aria-label={t("Search rows")} placeholder={t("Search rows")} value={query} onChange={e => setQuery(e.target.value)} />
      <select aria-label={kind === "products" ? t("Category") : t("Country")} value={groupFilter} onChange={e => setGroupFilter(e.target.value)}><option value="">{t("All")}</option>{[...new Set(rows.map(groupOf))].sort().map(value => <option key={value}>{value}</option>)}</select>
      <button type="button" className="button button-light" onClick={() => { change([...rows, kind === "products" ? { id: "", series: "", category: "Motherboard", model: "", ean: "", cashbackMinor: 0, quantityLimit: 1 } : { id: "", name: "", country: draft.markets[0] || "DE", url: "", validFrom: null, validTo: null }]); }}>{kind === "products" ? t("Add product") : t("Add retailer")}</button>
      <button type="button" className="button button-light" onClick={() => downloadText(`${kind}.csv`, csvText(columns, rows.map(record)), "text/csv;charset=utf-8")}>{t("Export CSV / blank template")}</button>
      <label className="button button-light file-button">{t("Import CSV")}<input type="file" accept=".csv,text/csv" onChange={async e => { const file = e.target.files?.[0]; e.target.value = ""; if (file) { if (file.size > 5 * 1024 * 1024) { setError(t("File exceeds the 5 MB import limit.")); return; } try { setCsv(importCsv(await file.text(), kind)); setCsvMode("merge"); } catch (error) { setError((error as Error).message); } } }} /></label>
      <button type="button" className="button button-light" disabled={catalogBusy} onClick={async () => { setCatalogBusy(true); setError(""); try { setCatalog(await configurationApi.catalog()); setCatalogSelected([]); } catch (e) { setError((e as Error).message); } finally { setCatalogBusy(false); } }}>{t("Browse master catalog")}</button>
    </div>
    {error && <p role="alert" className="error">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {csv && <div className="import-preview">
      <h4>{t("CSV dry-run preview")}</h4>
      <label>{t("Import mode")} <select value={csvMode} onChange={e => setCsvMode(e.target.value as "merge" | "replace")}><option value="merge">{t("Merge by ID (imported values replace matching rows)")}</option><option value="replace">{t("Replace all rows in this editor")}</option></select></label>
      <p>{t("{incoming} valid rows; {matches} match existing IDs; {added} new IDs.", { incoming: incoming.length, matches: csvMatches, added: incoming.length - csvMatches })}</p>
      <p>{csvMode === "replace" ? t("All {count} current rows will be replaced after confirmation.", { count: rows.length }) : t("{count} matching rows will be overwritten; other current rows remain.", { count: csvMatches })}</p>
      <div className="table-wrap configuration-diff"><table><thead><tr><th>{t("ID")}</th><th>{t("Current editor")}</th><th>{t("Imported value")}</th></tr></thead><tbody>{incoming.map(row => <tr key={row.id}><td>{row.id}</td><td><pre>{JSON.stringify(rows.find(old => old.id.toLowerCase() === row.id.toLowerCase()) ?? null, null, 2)}</pre></td><td><pre>{JSON.stringify(row, null, 2)}</pre></td></tr>)}</tbody></table></div>
      {csv.errors.length > 0 && <><p className="error">{t("Resolve all errors before applying. No rows have been changed.")}</p><ul>{csv.errors.map((issue, i) => <li key={i}><code>{issue.path}</code>: {issue.message}</li>)}</ul><button type="button" className="button button-light" onClick={() => downloadText(`${kind}-errors.csv`, csvText(["path", "message", "sourceRow"], csv.errors.map(issue => ({ ...issue, sourceRow: JSON.stringify(csv.sourceRows[Number(issue.path.match(/^row\[(\d+)\]/)?.[1] || 1) - 1] ?? []) }))), "text/csv;charset=utf-8")}>{t("Download error rows")}</button></>}
      <div className="actions"><button type="button" className="button button-primary" disabled={csv.errors.length > 0 || !incoming.length} onClick={() => { change(mergeRows(rows, incoming, csvMode)); setSelected([]); setCsv(null); setNotice(t("CSV applied to editor only. Save draft to persist.")); }}>{t("Confirm CSV changes in editor")}</button><button type="button" className="button button-light" onClick={() => setCsv(null)}>{t("Cancel")}</button></div>
    </div>}
    {catalog && <div className="import-preview">
      <h4>{t("Reusable master catalog")}</h4><p>{t("Catalog stores product / retailer identity only. New products start at zero reward and quantity 1; set campaign rewards before publishing. Existing reward and validity values are preserved.")}</p>
      <div className="toolbar"><input aria-label={t("Search catalog")} placeholder={t("Search catalog")} value={catalogQuery} onChange={e => setCatalogQuery(e.target.value)} /><select aria-label={t("Catalog group")} value={catalogGroup} onChange={e => setCatalogGroup(e.target.value)}><option value="">{t("All groups")}</option>{[...new Set(masterRows.map(row => row.group))].filter(Boolean).sort().map(group => <option key={group}>{group}</option>)}</select><select aria-label={t("Category / country")} value={catalogCategory} onChange={e => setCatalogCategory(e.target.value)}><option value="">{t("All categories / countries")}</option>{[...new Set(masterRows.map(row => "category" in row ? row.category : row.country))].sort().map(value => <option key={value}>{value}</option>)}</select></div>
      <label className="check"><input type="checkbox" checked={filteredCatalog.length > 0 && filteredCatalog.every(row => catalogSelected.includes(row.id))} onChange={e => setCatalogSelected(e.target.checked ? [...new Set([...catalogSelected, ...filteredCatalog.map(row => row.id)])] : catalogSelected.filter(id => !filteredCatalog.some(row => row.id === id)))} />{t("Select all filtered catalog rows")}</label>
      <div className="catalog-list">{filteredCatalog.map(row => <label className="catalog-row" key={row.id}><input type="checkbox" checked={catalogSelected.includes(row.id)} onChange={e => setCatalogSelected(e.target.checked ? [...catalogSelected, row.id] : catalogSelected.filter(id => id !== row.id))} /><span><b>{"model" in row ? row.model : row.name}</b><small>{row.id} · {"category" in row ? row.category : row.country} · {row.group}{rows.some(old => old.id.toLowerCase() === row.id.toLowerCase()) ? ` · ${t("Already in campaign")}` : ""}</small></span></label>)}{!filteredCatalog.length && <p>{t("No catalog rows match. Save selected campaign rows to build the catalog.")}</p>}</div>
      <label className="check"><input type="checkbox" checked={updateMetadata} onChange={e => setUpdateMetadata(e.target.checked)} />{t("Update matching identity fields from catalog (keep campaign rewards, quantities and validity)")}</label>
      <div className="actions"><button type="button" className="button button-primary" disabled={!catalogSelected.length} onClick={() => {
        const next = [...rows];
        for (const master of selectedMaster) {
          const { group: _group, ...identity } = master;
          const i = next.findIndex(row => row.id.toLowerCase() === master.id.toLowerCase());
          if (i >= 0) { if (updateMetadata) next[i] = { ...next[i], ...identity } as Row; }
          else next.push(kind === "products" ? { ...identity, cashbackMinor: 0, quantityLimit: 1 } as Product : { ...identity, validFrom: null, validTo: null } as Retailer);
        }
        change(next); setCatalog(null); setNotice(t("Catalog selection applied to editor. Review rewards and save draft."));
      }}>{t("Apply selected catalog rows to editor")} ({catalogSelected.length})</button><button type="button" className="button button-light" onClick={() => setCatalog(null)}>{t("Close catalog")}</button></div>
    </div>}
    <div className="bulk-toolbar">
      <span>{t("{selected} selected / {visible} visible / {total} total", { selected: selected.length, visible: filtered.length, total: rows.length })}</span>
      <select aria-label={t("Bulk field")} value={bulkKey} onChange={e => { setBulkKey(e.target.value); setBulkValue(""); }}>{(kind === "products" ? ["cashbackMinor", "category", "series", "quantityLimit"] : ["country", "validFrom", "validTo"]).map(key => <option key={key} value={key}>{t(labels[key])}</option>)}</select>
      {bulkKey === "country" ? <select aria-label={t("Bulk value")} value={bulkValue} onChange={e => setBulkValue(e.target.value)}><option value="">{t("Select country")}</option>{markets.map(m => <option key={m}>{m}</option>)}</select> : <input aria-label={t("Bulk value")} type={bulkKey === "validFrom" || bulkKey === "validTo" ? "datetime-local" : bulkKey === "cashbackMinor" || bulkKey === "quantityLimit" ? "number" : "text"} value={bulkValue} onChange={e => setBulkValue(e.target.value)} />}
      <button type="button" className="button button-light" disabled={!selected.length} onClick={applyBulk}>{t("Apply to selection")}</button>
      <button type="button" className="button button-danger" disabled={!selected.length} onClick={() => { if (window.confirm(t("Remove {count} selected rows from this editor?", { count: selected.length }))) { change(rows.filter((_, i) => !selected.includes(i))); setSelected([]); } }}>{t("Remove selected")}</button>
      <button type="button" className="button button-light" disabled={!selected.length} onClick={() => setSelected([])}>{t("Clear selection")}</button>
    </div>
    <div className="table-wrap campaign-edit-table"><table><thead><tr><th><input aria-label={t("Select all filtered rows")} type="checkbox" checked={allFiltered} onChange={e => setSelected(e.target.checked ? [...new Set([...selected, ...filtered.map(row => row.index)])] : selected.filter(index => !filtered.some(row => row.index === index)))} /></th>{columns.map(key => <th key={key}>{t(labels[key])}</th>)}</tr></thead><tbody>{filtered.map(({ row, index }) => <tr key={index}><td><input aria-label={t("Select row {row}", { row: index + 1 })} type="checkbox" checked={selected.includes(index)} onChange={e => setSelected(e.target.checked ? [...selected, index] : selected.filter(i => i !== index))} /></td>{columns.map(key => <td key={key}>{key === "country" ? <select aria-label={`${t(labels[key])} ${index + 1}`} value={String(record(row)[key] ?? "")} onChange={e => setCell(index, key, e.target.value)}>{markets.map(m => <option key={m}>{m}</option>)}</select> : <input aria-label={`${t(labels[key])} ${index + 1}`} type={key === "cashbackMinor" || key === "quantityLimit" ? "number" : key === "validFrom" || key === "validTo" ? "datetime-local" : "text"} step={key === "cashbackMinor" || key === "quantityLimit" ? 1 : undefined} min={key === "cashbackMinor" ? 0 : key === "quantityLimit" ? 1 : undefined} value={key === "validFrom" || key === "validTo" ? utcInputValue(String(record(row)[key] ?? "")) : record(row)[key] ?? ""} onChange={e => setCell(index, key, e.target.value)} />}</td>)}</tr>)}</tbody></table></div>
    <details className="master-save"><summary>{t("Save selected identities to reusable catalog")}</summary><p>{t("Only selected identity fields are saved to the shared catalog. Campaign amounts, quantities and validity are excluded.")}</p><div className="toolbar"><input aria-label={t("Catalog group")} placeholder={t("Catalog group")} value={masterGroup} onChange={e => setMasterGroup(e.target.value)} /><input aria-label={t("Reason / reference")} placeholder={t("Reason / reference")} value={masterReason} onChange={e => setMasterReason(e.target.value)} /></div><label className="check"><input type="checkbox" checked={replaceMaster} onChange={e => setReplaceMaster(e.target.checked)} />{t("Replace conflicting shared catalog identities (existing campaigns remain unchanged)")}</label><button type="button" className="button button-light" disabled={catalogBusy || !selected.length || !masterReason.trim()} onClick={async () => {
      setCatalogBusy(true); setError("");
      try {
        const data: CampaignCatalog = { products: [], retailers: [] };
        for (const row of rows.filter((_, i) => selected.includes(i))) {
          if ("model" in row) { const { cashbackMinor: _amount, quantityLimit: _quantity, ...identity } = row; data.products.push({ ...identity, group: masterGroup }); }
          else { const { validFrom: _from, validTo: _to, ...identity } = row; data.retailers.push({ ...identity, group: masterGroup }); }
        }
        await configurationApi.saveCatalog(data, masterReason, replaceMaster ? "replace" : "reject");
        setNotice(t("Selected identities saved to shared catalog."));
      } catch (e) { setError((e as Error).message); } finally { setCatalogBusy(false); }
    }}>{t("Save selected to shared catalog")}</button></details>
  </section>;
}
