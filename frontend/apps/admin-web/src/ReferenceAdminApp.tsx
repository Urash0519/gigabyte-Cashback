import { useCallback, useEffect, useRef, useState } from "react";
import { api, urls, marketNames, type Campaign, type Claim, type Payment, type Session, type Event } from "@gigabyte-cashback/api-client";
import { date, money } from "@gigabyte-cashback/ui";
import { Campaigns } from "./Campaigns";
import { Claims } from "./Claims";
import { Payments } from "./Payments";
import { Notifications } from "./Notifications";
import { useLocale } from "./i18n";
import { ReferenceDashboard, ReferenceSummary, StatusKey } from "./ReferenceReports";
import { ReferenceDetailed } from "./ReferenceDetailed";
import "./reference-admin.css";

type Page = "promotions" | "dashboard" | "summaries" | "pivot" | "detailed" | "service" | "fraud" | "status" | "campaigns" | "payments" | "notifications" | "audit";
type PromotionGroup = "Active" | "Confirmed" | "Archived" | "Draft" | "Paused";
const navigation: [Page, string, string][] = [
  ["dashboard", "▦", "Dashboard"], ["summaries", "≡", "Summaries"], ["pivot", "▤", "Pivot"],
  ["detailed", "☷", "Detailed"], ["service", "☰", "Customer Service Overview"], ["fraud", "⚑", "Fraud Claims"], ["status", "?", "Status Key"],
];
const countryName = (value: string) => marketNames[value] ?? value;
const publicBase = new URL(urls.public.endsWith("/") ? urls.public : urls.public + "/", window.location.origin);
const referencePublic = new URL("reference/", publicBase).href;

export function ReferenceAdminApp() {
  const { locale, setLocale, t } = useLocale();
  const [session, setSession] = useState<Session>();
  const [page, setPage] = useState<Page>("promotions");
  const [group, setGroup] = useState<PromotionGroup>("Active");
  const [campaignId, setCampaignId] = useState("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [search, setSearch] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [summaryDimension, setSummaryDimension] = useState("purchaseCountry");
  const referenceRoot = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const reload = useCallback(async () => {
    const [nextCampaigns, nextClaims, nextPayments, nextEvents] = await Promise.all([api.campaigns(true), api.claims(true), api.payments(), api.audit()]);
    setCampaigns(nextCampaigns); setClaims(nextClaims); setPayments(nextPayments); setEvents(nextEvents);
    setRefreshVersion(value => value + 1);
  }, []);
  const run = async (fn: () => Promise<unknown>, success: string) => {
    setBusy(true); setError(""); setMessage("");
    try { await fn(); setMessage(t(success)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : String(caught)); }
    finally { setBusy(false); }
  };
  useEffect(() => {
    let live = true;
    void api.session().then(async value => {
      if (!live) return;
      setSession(value);
      if (value.isAuthenticated && value.area === "admin") await reload();
    }).catch(caught => { if (live) setError(String(caught.message)); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [reload]);
  useEffect(() => {
    let live = true;
    const refresh = () => { void api.session().then(value => { if (live) setSession(value); }).catch(caught => { if (live) setError(String(caught.message)); }); };
    window.addEventListener("focus", refresh);
    return () => { live = false; window.removeEventListener("focus", refresh); };
  }, []);
  useEffect(() => {
    if (!mobileNav) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setMobileNav(false); menuButton.current?.focus(); }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [mobileNav]);
  useEffect(() => {
    const title = page === "promotions" ? "Promotions" : navigation.find(([key]) => key === page)?.[2] ?? page;
    document.title = `${title} · GIGABYTE Promotion Portal`;
  }, [page]);
  const logged = Boolean(session?.isAuthenticated && session.area === "admin");
  const campaign = campaigns.find(value => value.id === campaignId);
  const scopedClaims = claims.filter(value => value.data.campaignId === campaignId);
  const claimIds = new Set(scopedClaims.map(value => value.id));
  const scopedPayments = payments.filter(value => claimIds.has(value.claimId));
  const go = (nextPage: Page) => {
    setPage(nextPage); setMobileNav(false); setMessage("");
    requestAnimationFrame(() => {
      const content = document.getElementById("ra-main-content");
      content?.focus({ preventScroll: true });
      content?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    });
  };
  const openCampaign = (value: Campaign) => { setCampaignId(value.id); go("dashboard"); };
  const visibleCampaigns = campaigns.filter(value => value.data.status === group && value.data.name.toLowerCase().includes(search.toLowerCase()));
  const operationProps = { run, reload, busy };
  useEffect(() => {
    const root = referenceRoot.current;
    if (!root) return;
    // Enhance reused operational tables only inside this reference page.
    const enhanceTables = () => {
      for (const region of root.querySelectorAll<HTMLElement>(".table-wrap")) {
        if (!region.hasAttribute("tabindex")) region.tabIndex = 0;
        if (!region.hasAttribute("role")) region.setAttribute("role", "region");
        if (!region.hasAttribute("aria-label")) region.setAttribute("aria-label", `${region.closest("section")?.querySelector("h2")?.textContent ?? "Operations"} table`);
        for (const heading of region.querySelectorAll("thead th")) if (!heading.hasAttribute("scope")) heading.setAttribute("scope", "col");
      }
    };
    enhanceTables();
    const observer = new MutationObserver(enhanceTables);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return <div ref={referenceRoot} className="reference-admin">
    <a className="ra-skip-link" href="#ra-main-content">Skip to content</a>
    <div className="ra-evaluation">{t("Internal evaluation · sample data only · bank API and Google sign-in are not connected")}</div>
    <header className="ra-header">
      <a className="ra-brand" href={urls.admin}>GIGABYTE <small>Promotion portal</small></a>
      <nav aria-label="Comparison and account">
        <a className="ra-original" href={urls.admin}>Original admin ↗</a>
        <a href={referencePublic}>Consumer reference ↗</a>
        <label className="ra-language"><span className="ra-sr">Interface language</span><select aria-label="Interface language" value={locale} onChange={event => setLocale(event.target.value === "zh-TW" ? "zh-TW" : "en")}><option value="en">English</option><option value="zh-TW">繁體中文</option></select></label>
        {logged ? <button disabled={busy} onClick={() => void run(async () => { await api.logout(); setSession(await api.session()); }, "Signed out.")}>{t("Sign out")}</button> : null}
        {logged && page !== "promotions" ? <button ref={menuButton} className="ra-menu" aria-label={mobileNav ? "Close navigation" : "Open navigation"} aria-controls="ra-navigation" aria-expanded={mobileNav} onClick={() => setMobileNav(value => !value)}>☰</button> : null}
      </nav>
    </header>
    {loading || busy ? <p className="ra-loading-status" role="status">{t(loading ? "Loading…" : "Saving / loading…")}</p> : null}
    {!logged ? <>
      <section className="ra-hero ra-welcome"><h1>Promotion reports</h1><span className="ra-pill">GIGABYTE</span></section>
      <main id="ra-main-content" tabIndex={-1} className="ra-login" aria-busy={loading || busy}>
        {error ? <p className="message error" role="alert">{t(error)}</p> : null}
        <h2>{t("Promotion operations")}</h2><p>{t("Manage campaigns, review claims and reconcile payments.")}</p>
        <button className="ra-primary" disabled={busy || loading} onClick={() => void run(async () => { setSession(await api.login("admin")); await reload(); }, "Signed in with the development identity.")}>{t("Sign in for development")}{loading ? " · Checking session…" : busy ? ` · ${t("Signing in…")}` : ""}</button>
        <small>{t("Google sign-in will replace this development button.")}</small>
      </main>
    </> : page === "promotions" ? <>
      <section className="ra-hero ra-welcome"><h1>Welcome {session?.email?.split("@")[0]}!</h1><span className="ra-pill">GIGABYTE</span></section>
      <main id="ra-main-content" tabIndex={-1} className="ra-promotions" aria-busy={loading || busy}>
        {error ? <p className="message error" role="alert">{t(error)}</p> : null}
        {message ? <p className="message" role="status">{message}</p> : null}
        <div className="ra-list-heading"><b>Click any campaign on the list below to view the reports</b><div className="ra-list-actions"><label className="ra-search"><span className="ra-sr">Search promotions</span><input type="search" autoComplete="off" aria-label="Search promotions" placeholder="Search promotions…" value={search} onChange={event => setSearch(event.target.value)} /></label><button className="ra-primary" disabled={busy || loading} onClick={() => void run(reload, "Overview refreshed.")}>{t("Refresh")}</button><button className="ra-primary" onClick={() => go("campaigns")}>{t("Manage campaigns")}</button></div></div>
        <div className="ra-promotion-tabs" aria-label="Promotion status">{(["Active", "Confirmed", "Archived", "Draft", "Paused"] as const).map(value => <button key={value} className={group === value ? "selected" : ""} aria-pressed={group === value} onClick={() => setGroup(value)}>{value} Promotions</button>)}</div>
        <p className="ra-scope-note">Each tab matches the campaign's saved status. Draft and paused campaigns remain available for operations.</p>
        <span className="ra-cashback-count" role="status">CASHBACK ({loading ? "…" : visibleCampaigns.length})</span>
        <p className="ra-scroll-hint">Scroll the table horizontally to view all columns. Keyboard: focus the table, then use the arrow keys.</p>
        <div className="ra-promotion-table table-wrap" tabIndex={0} role="region" aria-label="Promotions table"><table><caption className="ra-sr">{group} promotions</caption><thead><tr><th scope="col">Promotion Name</th><th scope="col">Promotion Type</th><th scope="col">Promotion Period</th><th scope="col">Promotion Countries</th><th scope="col">Status</th></tr></thead><tbody>{visibleCampaigns.map(value => <tr key={value.id}><td><button className="ra-campaign-link" onClick={() => openCampaign(value)}>{value.data.name}</button></td><td><span className="ra-type-tag">{value.data.type.toUpperCase()}</span></td><td>{date(value.data.purchaseStart).split(",")[0]} – {date(value.data.purchaseEnd).split(",")[0]}</td><td>{(value.data.markets.length ? value.data.markets : [value.data.market]).map(countryName).join(", ")}</td><td>{t(value.data.status)}</td></tr>)}</tbody></table></div>
        {!loading && !busy && !error && !visibleCampaigns.length ? <div className="ra-empty" role="status"><p>No promotions match this view.</p>{search ? <button className="ra-primary" onClick={() => setSearch("")}>Clear search</button> : <button className="ra-primary" onClick={() => go("campaigns")}>Manage campaigns</button>}</div> : null}
      </main>
    </> : <div className="ra-workspace">
      <aside id="ra-navigation" className={`ra-sidebar ${mobileNav ? "ra-open" : ""}`}>
        <div className="ra-profile"><span>{session?.email}</span><small>GIGABYTE</small></div>
        <button className="ra-all-promotions" onClick={() => { setGroup("Active"); go("promotions"); }}><span aria-hidden="true">♧</span><span>All Active Promotions</span></button>
        <button className="ra-all-promotions" onClick={() => { setGroup("Archived"); go("promotions"); }}><span aria-hidden="true">▣</span><span>All Archived Promotions</span></button>
        <nav aria-label="Campaign reports">{navigation.map(([key, icon, label]) => <button key={key} className={page === key ? "selected" : ""} aria-current={page === key ? "page" : undefined} onClick={() => go(key)}><span aria-hidden="true">{icon}</span><span>{label}</span></button>)}</nav>
        <div className="ra-operation-links"><small>OPERATIONS</small>{([ ["campaigns", "Campaigns"], ["payments", "Payments"], ["notifications", "Notifications"], ["audit", "Audit"] ] as [Page, string][]).map(([key, label]) => <button key={key} className={page === key ? "selected" : ""} aria-current={page === key ? "page" : undefined} onClick={() => go(key)}>{t(label)}</button>)}</div>
      </aside>
      <div className="ra-workspace-content">
        <section className="ra-hero ra-campaign-hero"><h1>{campaign?.data.name ?? "Promotion operations"}</h1>{campaign ? <span className="ra-pill">{date(campaign.data.purchaseStart).split(",")[0]}　⋯　{date(campaign.data.purchaseEnd).split(",")[0]}</span> : null}<div className="ra-campaign-picker"><label>Promotion <select value={campaignId} onChange={event => setCampaignId(event.target.value)}><option value="">Select a promotion</option>{campaigns.map(value => <option key={value.id} value={value.id}>{value.data.name}</option>)}</select></label><button disabled={busy} onClick={() => void run(reload, "Overview refreshed.")}>{t("Refresh")}</button></div></section>
        <main id="ra-main-content" tabIndex={-1} className="ra-main" aria-busy={loading || busy}>
          {error ? <p className="message error" role="alert">{t(error)}</p> : null}{message ? <p className="message" role="status">{message}</p> : null}{busy ? <p role="status">{t("Saving / loading…")}</p> : null}
          {["dashboard", "summaries", "detailed", "fraud", "payments"].includes(page) && !campaign ? <section className="ra-report-card"><h2>Select a promotion</h2><p>Choose a promotion above to view its reports and operations.</p></section> : null}
          {page === "dashboard" && campaign ? <ReferenceDashboard key={campaign.id} campaign={campaign} claims={scopedClaims} payments={scopedPayments} refreshVersion={refreshVersion} onSummary={dimension => { setSummaryDimension(dimension); go("summaries"); }} onClaims={() => go("detailed")} onPayments={() => go("payments")} /> : null}
          {page === "summaries" && campaign ? <ReferenceSummary key={`${campaign.id}:${summaryDimension}`} campaign={campaign} refreshVersion={refreshVersion} initialDimension={summaryDimension} /> : null}
          {page === "detailed" && campaign ? <ReferenceDetailed key={campaign.id} campaign={campaign} claims={scopedClaims} {...operationProps} /> : null}
          {page === "payments" && campaign ? <Payments key={campaign.id} payments={scopedPayments} claims={scopedClaims} {...operationProps} /> : null}
          {page === "fraud" && campaign ? <><section className="ra-report-card"><h2>Fraud Claims · Risk holds</h2><p>Our review workflow flags cases on hold. A risk hold is not a confirmed fraud decision. Fraud savings and fraud country analytics are not available.</p></section><Claims key={campaign.id} claims={scopedClaims.filter(value => value.onHold)} campaigns={[campaign]} {...operationProps} /></> : null}
          {page === "campaigns" ? <Campaigns campaigns={campaigns} {...operationProps} /> : null}
          {page === "notifications" ? <><p className="ra-scope-note">Notification delivery across all promotions.</p><Notifications /></> : null}
          {page === "pivot" ? <section className="ra-report-card"><h2>Pivot Reports</h2><p>Product / Store · Country / Product · Store / Country · Marketing Data</p><div className="ra-unavailable">Cross-dimension pivot reports are not available in the current reporting API.</div><button className="ra-primary" onClick={() => go("summaries")}>View available summary reports</button></section> : null}
          {page === "service" ? <section className="ra-report-card"><h2>Customer Service Overview</h2><div className="ra-unavailable">Customer queries, enquiry categories and a query tracker have not been implemented.</div><p>Claim review and supplemental information requests are available under Detailed. Notification delivery is available under Notifications.</p><button className="ra-primary" onClick={() => go("detailed")}>View claim operations</button></section> : null}
          {page === "status" ? <StatusKey /> : null}
          {page === "audit" ? <section className="ra-report-card"><h2>{t("Audit trail")}</h2><p className="ra-scope-note">Recorded operations across all promotions.</p><div className="table-wrap"><table><thead><tr><th>{t("UTC timestamp")}</th><th>{t("Actor")}</th><th>{t("Action")}</th><th>{t("Target")}</th><th>{t("Reason")}</th></tr></thead><tbody>{events.map(value => <tr key={value.id}><td>{date(value.createdAt)}</td><td>{value.actor}</td><td>{t(value.action)}</td><td>{value.targetId}</td><td>{value.reason}</td></tr>)}</tbody></table></div></section> : null}
          {campaign && page === "dashboard" ? <section className="ra-budget"><h2>Promotion budget</h2><div>{[["Budget", campaign.data.budgetMinor], ["Reserved", campaign.reservedMinor], ["Approved unpaid", campaign.approvedMinor], ["Paid", campaign.paidMinor], ["Available", campaign.availableMinor]].map(([label, value]) => <p key={label}><span>{t(String(label))}</span><strong>{money(Number(value), campaign.data.currency)}</strong></p>)}</div></section> : null}
        </main>
      </div>
    </div>}
    <footer className="ra-footer">GIGABYTE Promotion Portal · Reference layout comparison</footer>
  </div>;
}
