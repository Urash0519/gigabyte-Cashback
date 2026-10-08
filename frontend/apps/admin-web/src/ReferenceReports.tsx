import { useEffect, useState, type ReactNode } from "react";
import { api, marketNames, type Campaign, type Claim, type Payment, type Report, type ReportRow } from "@gigabyte-cashback/api-client";
import { date, downloadCsv, money } from "@gigabyte-cashback/ui";
import { useLocale } from "./i18n";

const dimensions: [string, string][] = [["reviewStatus", "Registrations Status Overview Report"], ["product", "Registrations by Product Overview"], ["purchaseCountry", "Registrations by Country Overview"], ["retailer", "Registrations by Store Overview"], ["paymentStatus", "Status of Deliverables"], ["month", "Registrations per period"], ["week", "Registrations per week"], ["riskHold", "Risk Holds Overview"], ["market", "Campaign Market Overview"], ["residenceCountry", "Residence Country Overview"], ["bankCountry", "Bank Country Overview"], ["language", "Language Overview"], ["category", "Category Overview"]];
const colors = ["#36b394", "#60b4f5", "#f34641", "#bc61c5", "#f5c914", "#09bccb", "#f79682", "#80959f"];
const errorText = (caught: unknown) => caught instanceof Error ? caught.message : String(caught);
function valueName(row: ReportRow, campaign: Campaign) {
  if (row.dimension === "product") return campaign.data.products.find(value => value.id === row.value)?.model ?? row.value;
  if (row.dimension === "retailer") return campaign.data.retailers.find(value => value.id === row.value)?.name ?? row.value;
  if (row.dimension.endsWith("Country") || row.dimension === "market") return marketNames[row.value] ?? row.value;
  return row.value === "None" ? "Not authorized" : row.value;
}
function ChartCard({ title, children, dark = false, onReport }: { title: string; children: ReactNode; dark?: boolean; onReport?: () => void }) {
  return <section className={`ra-report-card ra-chart-card ${dark ? "ra-dark-card" : ""}`}><header><h2>{title}</h2>{onReport ? <button className="ra-view-report" onClick={onReport}>VIEW FULL REPORT</button> : null}</header>{children}</section>;
}
function Bars({ values, color = "#ff731f" }: { values: { label: string; count: number }[]; color?: string }) {
  const maximum = Math.max(...values.map(value => value.count), 1);
  return values.length ? <div className="ra-bar-chart">{values.map((value, index) => <div className="ra-bar-row" key={`${value.label}:${index}`}><span>{value.label}</span><div className="ra-bar-track"><i style={{ width: `${value.count / maximum * 100}%`, background: `linear-gradient(180deg, ${color}, ${color}30)` }} /></div><b>{value.count}</b></div>)}</div> : <p className="ra-empty">No matching data.</p>;
}
function StatusRings({ claims }: { claims: Claim[] }) {
  const labels = [...new Set(claims.map(value => value.reviewStatus))];
  const values = labels.map(label => ({ label, count: claims.filter(value => value.reviewStatus === label).length }));
  return <div className="ra-rings"><svg viewBox="0 0 260 260" role="img" aria-label={`Registrations by review status: ${values.map(value => `${value.label} ${value.count}`).join(", ") || "No submitted claims"}`}>
    {values.slice(0, 8).map((value, index) => { const radius = 115 - index * 13; const circumference = 2 * Math.PI * radius; return <g key={value.label}><circle cx="130" cy="130" r={radius} fill="none" stroke="#edf0f1" strokeWidth="10" /><circle cx="130" cy="130" r={radius} fill="none" stroke={colors[index]} strokeWidth="10" strokeDasharray={`${value.count / Math.max(claims.length, 1) * circumference} ${circumference}`} transform="rotate(-90 130 130)" /></g>; })}
    <text x="130" y="127" textAnchor="middle">{claims.length}</text><text x="130" y="146" textAnchor="middle" className="ra-ring-label">Registrations</text>
  </svg><ul>{values.map((value, index) => <li key={value.label}><i style={{ background: colors[index % colors.length] }} />{value.label} <b>{value.count}</b><small>{(value.count / Math.max(claims.length, 1) * 100).toFixed(1)}%</small></li>)}</ul></div>;
}
export function ReferenceDashboard({ campaign, claims, payments, refreshVersion, onSummary, onClaims }: { campaign: Campaign; claims: Claim[]; payments: Payment[]; refreshVersion: number; onSummary: () => void; onClaims: () => void }) {
  const [report, setReport] = useState<Report>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true; setLoading(true); setReport(undefined); setError("");
    void api.reports({ campaignId: campaign.id }).then(value => { if (live) setReport(value); }).catch(caught => { if (live) setError(errorText(caught)); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [campaign.id, refreshVersion]);
  const submitted = claims.filter(value => value.submittedAt !== null && value.reviewStatus !== "Draft");
  const paymentStates = [...new Set(payments.map(value => value.status))].map(label => ({ label, count: payments.filter(value => value.status === label).length }));
  const rowsFor = (dimension: string) => report?.rows.filter(value => value.dimension === dimension).sort((left, right) => right.claims - left.claims).slice(0, 10).map(value => ({ label: `${valueName(value, campaign)} · ${value.currency}`, count: value.claims })) ?? [];
  const stores = rowsFor("retailer");
  const participants = new Set(submitted.map(value => value.data.email.trim().toLowerCase())).size;
  return <>{error ? <p className="message error" role="alert">{error}</p> : null}{loading ? <p role="status">Loading promotion reports…</p> : null}<div className="ra-dashboard" aria-busy={loading}>
    <ChartCard title="Transactions by Status" onReport={onClaims}><p className="ra-total">TOTAL: {payments.length} payment records</p><Bars values={paymentStates} color="#f5cd00" /></ChartCard>
    <ChartCard title="Registrations by Status" onReport={onClaims}><p className="ra-total">TOTAL: {submitted.length} submitted registrations</p><StatusRings claims={submitted} /></ChartCard>
    <ChartCard title="Top 10 Stores" dark onReport={onSummary}><p className="ra-total">Submitted claim counts · currency groups kept separate</p><div className="ra-store-rings">{stores.map((value, index) => <div key={value.label}><div className="ra-store-ring" style={{ borderTopColor: colors[index % colors.length] }}><b>{value.count}</b><small>claims</small></div><span>{value.label}</span></div>)}</div>{!stores.length ? <p className="ra-empty">No retailer data.</p> : null}</ChartCard>
    <ChartCard title="Fraud Protection in Effect" dark><p className="ra-total">RISK HOLDS: {submitted.filter(value => value.onHold).length}</p><div className="ra-unavailable">Fraud savings are not available.<br />Risk holds require review and do not establish fraud.</div></ChartCard>
    <ChartCard title="Top 10 Client Query Types"><div className="ra-unavailable">Client query tracking and categories are not available.</div></ChartCard>
    <ChartCard title="Top 10 Products" onReport={onSummary}><p className="ra-total">Submitted claim counts by product</p><Bars values={rowsFor("product")} /></ChartCard>
    <ChartCard title="Top 10 Customer Enquiry Types"><div className="ra-unavailable">Customer service enquiry tracking has not been implemented.</div></ChartCard>
    <ChartCard title="Top 10 Countries" onReport={onSummary}><p className="ra-total">Country of purchase · submitted claim counts</p><Bars values={rowsFor("purchaseCountry")} color="#35b398" /></ChartCard>
    <ChartCard title="Number of Registrations per Participant" onReport={onClaims}><p className="ra-total">Participants counted by distinct email address</p><div className="ra-participants">{[["Total registrations", submitted.length], ["Unique participants", participants]].map(([label, count], index) => <div key={label}><strong>{count}</strong><div style={{ height: `${Math.max(Number(count) / Math.max(submitted.length, 1) * 180, 2)}px`, background: index ? "#aad700" : "#0d95ce" }} /><span>{label}</span></div>)}</div></ChartCard>
  </div></>;
}

export function ReferenceSummary({ campaign, refreshVersion }: { campaign: Campaign; refreshVersion: number }) {
  const { t } = useLocale();
  const [dimension, setDimension] = useState("purchaseCountry");
  const [report, setReport] = useState<Report>();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({ market: "", from: "", to: "" });
  const [applied, setApplied] = useState({ market: "", from: "", to: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true; setBusy(true); setError(""); setReport(undefined);
    void api.reports({ campaignId: campaign.id, market: applied.market, from: applied.from ? applied.from + "T00:00:00Z" : "", to: applied.to ? applied.to + "T00:00:00Z" : "" }).then(value => { if (live) setReport(value); }).catch(caught => { if (live) setError(errorText(caught)); }).finally(() => { if (live) setBusy(false); });
    return () => { live = false; };
  }, [campaign.id, applied.market, applied.from, applied.to, refreshVersion]);
  const rows = report?.rows.filter(value => value.dimension === dimension).sort((left, right) => right.claims - left.claims) ?? [];
  const totals = new Map<string, number>();
  for (const row of rows) totals.set(row.currency, (totals.get(row.currency) ?? 0) + row.claims);
  const exportCsv = async () => {
    setBusy(true); setError("");
    try { const content = await api.exportReport({ campaignId: campaign.id, dimension, market: applied.market, from: applied.from ? applied.from + "T00:00:00Z" : "", to: applied.to ? applied.to + "T00:00:00Z" : "" }); downloadCsv(`promotion-${dimension}.csv`, content); }
    catch (caught) { setError(errorText(caught)); }
    finally { setBusy(false); }
  };
  return <section className="ra-report-card ra-summary">
    <header><h2>{dimensions.find(([key]) => key === dimension)?.[1]}</h2><button className="ra-download" disabled={busy || !report || !rows.length} onClick={() => void exportCsv()}>DOWNLOAD REPORT ↓</button></header>
    <div className="ra-summary-selector"><label>Summary report <select value={dimension} onChange={event => setDimension(event.target.value)}>{dimensions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
    <div className="ra-filter-strip"><span>Filters: <b>{Object.values(applied).filter(Boolean).length} Filters Applied</b></span><button aria-expanded={filtersOpen} onClick={() => setFiltersOpen(value => !value)}>Search Filters</button></div>
    {filtersOpen ? <form className="ra-report-filters" onSubmit={event => { event.preventDefault(); if (filters.from && filters.to && filters.to <= filters.from) { setError("Until must be after the start date."); return; } setApplied({ ...filters }); }}><label>Campaign market<select value={filters.market} onChange={event => setFilters(value => ({ ...value, market: event.target.value }))}><option value="">All markets</option>{campaign.data.markets.map(value => <option key={value} value={value}>{marketNames[value] ?? value}</option>)}</select></label><label>Submitted from (inclusive, UTC)<input type="date" value={filters.from} onChange={event => setFilters(value => ({ ...value, from: event.target.value }))} /></label><label>Submitted until (exclusive, UTC)<input type="date" value={filters.to} onChange={event => setFilters(value => ({ ...value, to: event.target.value }))} /></label><button className="ra-primary" disabled={busy}>Apply filters</button></form> : null}
    {error ? <p className="message error" role="alert">{error}</p> : null}{busy ? <p role="status">Loading…</p> : null}
    <div className="table-wrap ra-summary-table" aria-busy={busy}><table><thead><tr><th>N</th><th>Value</th><th>Currency</th><th>Count</th><th>Percentage</th><th>Items</th><th>Claimed amount</th><th>Approved</th><th>Rejected</th><th>Paid</th><th>On hold</th><th>SLA overdue</th></tr></thead><tbody>{rows.map((row, index) => <tr key={`${row.value}:${row.currency}`}><td>{index + 1}.</td><td>{t(valueName(row, campaign))}</td><td>{row.currency}</td><td>{row.claims}</td><td>{((row.claims / Math.max(totals.get(row.currency) ?? 0, 1)) * 100).toFixed(2)}%</td><td>{row.items}</td><td>{money(row.amountMinor, row.currency)}</td><td>{row.approved}</td><td>{row.rejected}</td><td>{row.paid}</td><td>{row.onHold}</td><td>{row.slaOverdue}</td></tr>)}</tbody></table></div>
    {!busy && !rows.length ? <p className="ra-empty">No submitted cases match the filters.</p> : null}
    <div className="ra-summary-footer"><span>{rows.length ? `1–${rows.length} of ${rows.length}` : "0 results"}</span><span>Generated {date(report?.generatedAt)} · {report?.timeZone ?? "UTC"}</span></div>
    <p className="ra-scope-note">Count = distinct submitted claims per group. Percentage = share of grouped counts within the same currency. Product and retailer groups may overlap; do not sum them into a total number of registrations. Export uses the latest matching data and records an audit event.</p>
  </section>;
}
export function StatusKey() {
  const statuses = [["Draft", "Claim saved, not submitted."], ["Submitted", "Submitted and awaiting review."], ["UnderReview", "Review in progress."], ["MoreInfoRequired", "Customer must provide additional information."], ["Approved", "Review accepted; payment is managed separately."], ["Rejected", "Review rejected."], ["Cancelled", "Claim cancelled."], ["On hold", "Risk or operational hold; separate from review status."], ["Succeeded", "Payment confirmed successful."], ["Failed / Unknown", "Payment exception requiring reconciliation."]];
  return <section className="ra-report-card"><h2>Status Key</h2><p>Review status, risk hold and payment status are tracked separately.</p><table><thead><tr><th>Status</th><th>Meaning</th></tr></thead><tbody>{statuses.map(([status, meaning]) => <tr key={status}><td><b>{status}</b></td><td>{meaning}</td></tr>)}</tbody></table></section>;
}
