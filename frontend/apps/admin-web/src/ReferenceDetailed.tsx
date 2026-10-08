import { useRef, useState } from "react";
import { type Campaign, type Claim } from "@gigabyte-cashback/api-client";
import { date, money } from "@gigabyte-cashback/ui";
import { Claims } from "./Claims";

const columns = ["Reference number", "Customer Name", "Date of Registration", "Date of Purchase", "Registration Status", "Product", "Serial Number", "Country of Purchase", "Purchase Price", "Store Name", "Transaction Status", "Claimed Cashback", "Risk Hold"];
type Props = { campaign: Campaign; claims: Claim[]; run: (fn: () => Promise<unknown>, message: string) => Promise<void>; reload: () => Promise<void>; busy: boolean };
export function ReferenceDetailed({ campaign, claims, run, reload, busy }: Props) {
  const [review, setReview] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [visible, setVisible] = useState(() => new Set(columns));
  const columnMenu = useRef<HTMLDetailsElement>(null);
  const rows = claims.filter(claim => claim.reviewStatus !== "Draft" && (!status || claim.reviewStatus === status) && `${claim.reference} ${claim.data.email} ${claim.data.firstName} ${claim.data.lastName} ${claim.data.invoiceNumber} ${claim.data.items.map(item => item.serialNumber).join(" ")}`.toLowerCase().includes(search.toLowerCase()));
  const statuses = [...new Set(claims.filter(claim => claim.reviewStatus !== "Draft").map(claim => claim.reviewStatus))];
  const shownColumns = columns.map((label, index) => ({ label, index })).filter(({ label }) => visible.has(label));
  return <>
    <div className="ra-detail-tabs"><button className={!review ? "selected" : ""} aria-pressed={!review} onClick={() => setReview(false)}>Detailed Promotion Overview</button><button className={review ? "selected" : ""} aria-pressed={review} onClick={() => setReview(true)}>Review cases</button></div>
    {review ? <Claims claims={claims} campaigns={[campaign]} run={run} reload={reload} busy={busy} /> : <section className="ra-report-card ra-summary">
      <header><h2>Detailed Promotion Overview</h2><span className="ra-scope-note" role="status">Submitted cases · {rows.length} results</span></header>
      <div className="ra-filter-strip"><span>Filters: <b>{Number(Boolean(search)) + Number(Boolean(status))} Filters Applied</b></span><span>Current promotion</span></div>
      <div className="ra-detailed-controls"><label><span>Search customer or reference</span><input type="search" autoComplete="off" placeholder="Customer, reference, invoice, SN…" value={search} onChange={event => setSearch(event.target.value)} /></label><label><span>Review status</span><select value={status} onChange={event => setStatus(event.target.value)}><option value="">All statuses</option>{statuses.map(value => <option key={value}>{value}</option>)}</select></label><details ref={columnMenu} className="ra-column-visibility" onToggle={event => { if (event.currentTarget.open) event.currentTarget.querySelector("summary")?.scrollIntoView({ block: "center", behavior: "instant" }); }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false; }} onKeyDown={event => { if (event.key === "Escape" && columnMenu.current?.open) { columnMenu.current.open = false; columnMenu.current.querySelector("summary")?.focus(); event.stopPropagation(); } }}><summary>Column visibility ⌄</summary><div><p className="ra-scope-note">Keep at least one column visible.</p>{columns.map(label => <label key={label}><input type="checkbox" checked={visible.has(label)} disabled={visible.size === 1 && visible.has(label)} onChange={() => setVisible(current => { const next = new Set(current); if (next.has(label)) { if (next.size > 1) next.delete(label); } else next.add(label); return next; })} />{label}</label>)}</div></details></div>
      <p className="ra-scroll-hint">Scroll horizontally for all columns. Keyboard: focus the table, then use the arrow keys.</p>
      <div className="table-wrap ra-detailed-table" tabIndex={0} role="region" aria-label="Detailed promotion report table" aria-busy={busy}><table style={{ minWidth: Math.max(shownColumns.length * 130 + 40, 350) }}><caption className="ra-sr">Submitted claims for {campaign.data.name}</caption><thead><tr><th scope="col">N</th>{shownColumns.map(({ label }) => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{rows.map((claim, index) => {
        const rules = campaign.versions.find(version => version.id === claim.campaignVersionId)?.data ?? campaign.data;
        const retailerIds = [...new Set(claim.data.items.map(item => item.retailerId || claim.data.retailerId))];
        const values = [claim.reference, `${claim.data.firstName} ${claim.data.lastName}`, date(claim.submittedAt), date(claim.data.purchaseDate), claim.reviewStatus, claim.data.items.map(item => rules.products.find(product => product.id === item.productId)?.model ?? item.productId).join("; "), claim.data.items.map(item => item.serialNumber).join("; "), claim.data.purchaseCountry, money(claim.data.purchaseAmountMinor, claim.currency), retailerIds.map(id => rules.retailers.find(retailer => retailer.id === id)?.name ?? id).join("; "), claim.paymentStatus || "Not authorized", money(claim.amountMinor, claim.currency), claim.onHold ? "On hold" : "Clear"];
        return <tr key={claim.id}><td>{index + 1}.</td>{shownColumns.map(({ label, index: column }) => <td key={label}>{values[column] || "—"}</td>)}</tr>;
      })}</tbody></table></div>
      {!busy && !rows.length ? <div className="ra-empty" role="status"><p>No submitted cases match the filters.</p>{search || status ? <button className="ra-primary" onClick={() => { setSearch(""); setStatus(""); }}>Clear filters</button> : null}</div> : null}
      <div className="ra-summary-footer"><span>{rows.length ? `1–${rows.length} of ${rows.length}` : "0 results"}</span><button className="ra-primary" onClick={() => setReview(true)}>Review cases</button></div>
      <p className="ra-scope-note">Product and store names use the campaign version recorded with each claim. Purchase price and claimed cashback use the claim currency. Claimed cashback is the requested amount, not a confirmed bank transfer. Multiple products appear on the same claim row. To review documents or update a case, open Review cases.</p>
    </section>}
  </>;
}
