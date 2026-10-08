import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { api, blankClaim, marketNames, markets, urls, type Campaign, type Claim, type Session } from "@gigabyte-cashback/api-client";
import { ActionForm, Badge, date, money, Panel } from "@gigabyte-cashback/ui";
import { BankChange } from "./BankChange";
import { ClaimForm } from "./ClaimForm";
import { useLocale } from "./i18n";
import "./reference.css";

type View = "portal" | "countries" | "promotion" | "login" | "form" | "tracker" | "case" | "faq" | "terms" | "privacy";
type Route = { view: View; campaignId: string; market: string; claimId: string };
const views: View[] = ["portal", "countries", "promotion", "login", "form", "tracker", "case", "faq", "terms", "privacy"];
function readRoute(): Route {
  const [path, query] = window.location.hash.slice(1).split("?");
  const params = new URLSearchParams(query);
  const view = path?.replace(/^\//, "") as View;
  return { view: views.includes(view) ? view : "portal", campaignId: params.get("campaign") ?? "", market: markets.includes(params.get("market") ?? "") ? params.get("market")! : "DE", claimId: params.get("claim") ?? "" };
}
function routeUrl(route: Route) {
  const params = new URLSearchParams({ market: route.market });
  if (route.campaignId) params.set("campaign", route.campaignId);
  if (route.claimId) params.set("claim", route.claimId);
  return `#/${route.view}?${params}`;
}
const period = (start: string, end: string) => `${start.slice(0, 10)} – ${end.slice(0, 10)}`;
const accepting = (c: Campaign) => c.data.acceptingClaims && new Date(c.data.claimStart).getTime() <= Date.now() && Date.now() <= new Date(c.data.claimEnd).getTime();
const flagColors: Record<string, string> = { DE: "#090909 0 33.333%, #dc1724 33.333% 66.666%, #ffce00 66.666%", FR: "#00328f 0 33.333%, #fff 33.333% 66.666%, #ed2639 66.666%", IT: "#008b49 0 33.333%, #fff 33.333% 66.666%, #de2435 66.666%", NL: "#ba2034 0 33.333%, #fff 33.333% 66.666%, #21468b 66.666%", ES: "#aa151b 0 25%, #f1bf00 25% 75%, #aa151b 75%" };
const isQ1 = (campaign: Campaign) => /q1|build[ -]beyond/i.test(`${campaign.data.slug} ${campaign.data.name}`);
function Flag({ market }: { market: string }) {
  return <span className="ref-flag" aria-hidden="true" style={{ background: `linear-gradient(${["FR", "IT"].includes(market) ? "90deg" : "180deg"}, ${flagColors[market] ?? "#777, #ccc"})` }} />;
}
function Artwork({ campaign, compact = false }: { campaign?: Campaign; compact?: boolean }) {
  if (!campaign?.data.bannerUrl && (!campaign || !isQ1(campaign))) return <div className={compact ? "ref-card-placeholder" : "ref-hero-placeholder"}><b>GIGABYTE</b><span>{campaign?.data.name ?? "Cashback promotions"}</span></div>;
  return <img className={compact ? "ref-card-art" : "ref-hero"} src={campaign?.data.bannerUrl || "/assets/q1-reference-hero.jpg"} width={1920} height={859} alt={campaign?.data.bannerUrl ? campaign.data.name : "Build Beyond — user supplied promotion artwork"} />;
}
function ReferenceCard({ campaign, onOpen }: { campaign: Campaign; onOpen: () => void }) {
  return <article className="ref-promotion-card">
    <button className="ref-art-link" onClick={onOpen} aria-label={`View ${campaign.data.name}`}><Artwork campaign={campaign} compact /></button>
    <small>{period(campaign.data.purchaseStart, campaign.data.purchaseEnd)}</small>
    <h3><button className="ref-plain" onClick={onOpen}>{campaign.data.name}</button></h3>
    <p>{campaign.data.description}</p>
    <div className="ref-tags">{[...new Set(campaign.data.products.map(p => p.category))].map(category => <span key={category}>◆ {category}</span>)}</div>
  </article>;
}
function Content({ title, children }: { title: string; children: ReactNode }) {
  return <section className="ref-content"><h1>{title}</h1>{children}</section>;
}
function FaqContent({ campaign }: { campaign: Campaign }) {
  // Keep administrator-authored content authoritative; a paragraph becomes an expandable row.
  const entries = campaign.data.faq.split(/\n\s*\n/).filter(entry => entry.trim());
  return <div className="ref-faq-list">{entries.length ? entries.map((entry, index) => {
    const [question, ...answer] = entry.split("\n");
    return answer.length ? <details key={index}><summary>{question}</summary><p className="pre-wrap">{answer.join("\n")}</p></details> : <p key={index} className="pre-wrap">{entry}</p>;
  }) : <p>No FAQs have been provided for this promotion.</p>}</div>;
}
function ReferencePromotion({ campaign: c, market, busy, onStart, onTrack, onTerms, onAccount }: { campaign: Campaign; market: string; busy: boolean; onStart: () => void; onTrack: () => void; onTerms: () => void; onAccount: () => void }) {
  const [category, setCategory] = useState(c.data.products[0]?.category ?? "");
  const [search, setSearch] = useState("");
  const [showAllRetailers, setShowAllRetailers] = useState(false);
  const categories = [...new Set(c.data.products.map(p => p.category))];
  const products = c.data.products.filter(p => (!category || p.category === category) && `${p.model} ${p.series} ${p.id}`.toLowerCase().includes(search.toLowerCase()));
  const retailers = c.data.retailers.filter(retailer => showAllRetailers || retailer.country === market);
  const categoryAssets: Record<string, string> = { "Graphics Card": "graphics-card", "Motherboard": "motherboard", "Monitor": "monitor" };
  return <>
    <section className="ref-intro ref-diagonal">
      <h1>{c.data.name}</h1><p className="ref-intro-copy">{c.data.description}</p>
      <div className="ref-dates"><div>Purchase period:<strong>{period(c.data.purchaseStart, c.data.purchaseEnd)}</strong></div><div>Claim period:<strong>{period(c.data.claimStart, c.data.claimEnd)}</strong></div></div>
      <h2>How it works</h2>
      <ol className="ref-process"><li><span>1</span><p>Buy an eligible product from a participating retailer.</p><b>Wait {c.data.waitingDays} days</b></li><li><span>2</span><p>Complete your claim and upload your proof of purchase.</p><b>Submit within the claim period</b></li><li><span>3</span><p>Track the review and payment of your cashback.</p><b>Follow your claim online</b></li></ol>
      <div className="ref-action-cards"><button onClick={onAccount}><span aria-hidden="true">♙</span><b>YOUR CASHBACK ACCOUNT</b></button><button disabled={busy || !accepting(c)} onClick={onStart}><span aria-hidden="true">↗</span><b>{accepting(c) ? "SUBMIT YOUR CLAIM" : "CLAIMS CURRENTLY UNAVAILABLE"}</b></button><button onClick={onTrack}><span aria-hidden="true">⌕</span><b>TRACK YOUR CLAIM</b></button></div>
      <button className="ref-text-link" onClick={onTerms}>Terms and conditions</button>
    </section>
    <section className="ref-products ref-gold"><div className="ref-container"><h2>Participating products</h2>
      <div className="ref-category-tabs" role="group" aria-label="Product categories">{categories.map(cat => <button key={cat} aria-pressed={category === cat} className={category === cat ? "active" : ""} onClick={() => setCategory(cat)}>{isQ1(c) && categoryAssets[cat] ? <img src={`/assets/q1-reference-${categoryAssets[cat]}.jpg`} alt="" width={150} height={154} loading="lazy" /> : <span aria-hidden="true">{cat === "Monitor" ? "▣" : cat === "Motherboard" ? "▦" : "▰"}</span>}{cat}</button>)}</div>
      <label className="ref-product-search">Search products<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Product or series…" autoComplete="off" /></label>
      <div className="table-wrap" role="region" aria-label="Eligible products and cashback" tabIndex={0}><table><caption className="ref-sr-only">Eligible {category || "products"} and cashback in {c.data.currency}</caption><thead><tr><th scope="col">{category || "Product"}</th><th scope="col">Cashback ({c.data.currency})</th></tr></thead><tbody>{products.map(product => <tr key={product.id}><td>{product.model}</td><td>{money(product.cashbackMinor, c.data.currency)}</td></tr>)}</tbody></table></div>
      {!products.length && <p>No eligible products match this selection.</p>}
      <p className="ref-fine-print">Rewards and eligibility follow this promotion’s current published rules.</p>
    </div></section>
    <section className="ref-important"><div className="ref-info-box"><h2>Important information</h2><ul><li>Wait {c.data.waitingDays} days after purchase before submitting your claim.</li><li>All claimed products must appear on the same invoice.</li><li>Maximum {c.data.maxItemsPerCategory} item(s) per category and {c.data.maxClaimsPerPerson} claim(s) per person.</li><li>Submit within {period(c.data.claimStart, c.data.claimEnd)}.</li></ul><button className="ref-text-link" onClick={onTerms}>Read all promotion terms</button></div></section>
    <section className="ref-retailers"><div className="ref-container"><h2>Participating retailers</h2><p>Promotion market: {marketNames[market] ?? market}.</p><label className="ref-retailer-toggle"><input type="checkbox" checked={showAllRetailers} onChange={e => setShowAllRetailers(e.target.checked)} />All eligible purchase countries</label><div className="ref-retailer-grid">{retailers.map(retailer => <article key={retailer.id}><strong>{retailer.name}</strong><small>{marketNames[retailer.country] ?? retailer.country}</small>{/^https?:\/\//i.test(retailer.url) && <a href={retailer.url} target="_blank" rel="noreferrer">Visit retailer ↗</a>}{(retailer.validFrom || retailer.validTo) && <small>{retailer.validFrom?.slice(0, 10) || "—"} – {retailer.validTo?.slice(0, 10) || "—"}</small>}</article>)}</div>{!retailers.length && <p>No retailers are listed for this selection.</p>}</div></section>
  </>;
}

export default function ReferenceApp() {
  const { locale, setLocale, t } = useLocale();
  const [route, setRoute] = useState<Route>(readRoute);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [snapshots, setSnapshots] = useState<Record<string, Campaign>>({});
  const [session, setSession] = useState<Session>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reference, setReference] = useState("");
  const [searchReference, setSearchReference] = useState("");
  const [referenceError, setReferenceError] = useState("");
  const main = useRef<HTMLElement>(null);
  const scrollToContent = useRef(!["portal", "promotion"].includes(readRoute().view));
  const focusContent = useCallback((scroll: boolean) => {
    const heading = main.current?.querySelector<HTMLElement>("h1") ?? [...(main.current?.querySelectorAll<HTMLElement>("h2") ?? [])].find(element => !element.closest("dialog"));
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
      if (scroll) heading.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    }
    document.title = `${heading?.textContent ?? "Promotions"} · GIGABYTE Cashback`;
  }, []);
  const referenceInput = useRef<HTMLInputElement>(null);
  const dirty = useRef(false);
  const previousHash = useRef(window.location.hash);
  const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null);
  const leaveDialog = useRef<HTMLDialogElement>(null);
  const requestLeave = useCallback((action: () => void) => {
    if (dirty.current) setPendingLeave(() => action);
    else action();
  }, []);
  useEffect(() => {
    if (pendingLeave && !leaveDialog.current?.open) leaveDialog.current?.showModal();
    else if (!pendingLeave && leaveDialog.current?.open) leaveDialog.current.close();
  }, [pendingLeave]);
  const logged = Boolean(session?.isAuthenticated);
  const campaign = campaigns.find(c => c.id === route.campaignId);
  const claim = claims.find(c => c.id === route.claimId);
  const selectedCampaign = (claim && snapshots[claim.id]) || campaign;
  const isPortal = route.view === "portal";
  const go = useCallback((view: View, changes: Partial<Route> = {}) => {
    requestLeave(() => {
      const nextHash = routeUrl({ ...readRoute(), view, ...changes });
      if (window.location.hash === nextHash) focusContent(true);
      else window.location.hash = nextHash;
    });
  }, [requestLeave, focusContent]);
  useEffect(() => {
    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    const handleHash = () => {
      if (window.location.hash !== previousHash.current && dirty.current) {
        const nextHash = window.location.hash;
        window.history.replaceState(null, "", previousHash.current || window.location.pathname);
        requestLeave(() => { window.location.hash = nextHash; });
        return;
      }
      previousHash.current = window.location.hash;
      scrollToContent.current = true;
      setRoute(readRoute()); setError(""); setMessage(""); setReferenceError("");
    };
    const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty.current) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("hashchange", handleHash);
    window.addEventListener("beforeunload", beforeUnload);
    return () => { window.history.scrollRestoration = previousRestoration; window.removeEventListener("hashchange", handleHash); window.removeEventListener("beforeunload", beforeUnload); };
  }, [requestLeave]);
  useEffect(() => {
    if (loading) return;
    focusContent(scrollToContent.current);
    scrollToContent.current = false;
  }, [route.view, route.claimId, route.campaignId, route.market, loading, focusContent]);
  const loadClaims = useCallback(async () => {
    const rows = await api.claims();
    const versions = [...new Map(rows.map(row => [row.campaignVersionId ?? row.id, row])).values()];
    const entries = await Promise.all(versions.map(async row => [row.campaignVersionId ?? row.id, await api.claimCampaign(row.id)] as const));
    const byVersion = new Map(entries);
    setSnapshots(Object.fromEntries(rows.map(row => [row.id, byVersion.get(row.campaignVersionId ?? row.id)!])));
    setClaims(rows);
  }, []);
  const reload = useCallback(async () => {
    const [nextCampaigns, nextSession] = await Promise.all([api.campaigns(), api.session()]);
    setCampaigns(nextCampaigns); setSession(nextSession);
    if (nextSession.isAuthenticated) await loadClaims();
    else { setClaims([]); setSnapshots({}); }
  }, [loadClaims]);
  useEffect(() => { let active = true; void reload().catch(e => { if (active) setError(e instanceof Error ? e.message : String(e)); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [reload]);
  useEffect(() => {
    // Preserve explicit deep links; only choose a default for the bare comparison URL.
    if (loading || window.location.hash || !campaigns.length) return;
    const initial = campaigns.find(c => c.data.slug === "q1-build-beyond-uat-v1") ?? campaigns.find(isQ1) ?? campaigns[0];
    const initialMarket = initial.data.markets.includes("DE") ? "DE" : initial.data.markets.find(market => markets.includes(market));
    if (!initialMarket) return;
    window.history.replaceState(null, "", routeUrl({ view: "promotion", campaignId: initial.id, market: initialMarket, claimId: "" }));
    previousHash.current = window.location.hash;
    setRoute(readRoute());
  }, [loading, campaigns]);
  const run = async (action: () => Promise<void>, success = "") => {
    setBusy(true); setError(""); setMessage("");
    try { await action(); setMessage(success); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  };
  const updateClaim = (saved: Claim) => setClaims(old => old.some(row => row.id === saved.id) ? old.map(row => row.id === saved.id ? saved : row) : [saved, ...old]);
  const createDraft = async (c: Campaign, identity: Session) => {
    const draft = await api.createClaim({ ...blankClaim(c.id), email: identity.email ?? "", confirmEmail: identity.email ?? "", market: route.market, residenceCountry: route.market, purchaseCountry: route.market, bankCountry: route.market, language: locale });
    const snapshot = await api.claimCampaign(draft.id);
    updateClaim(draft); setSnapshots(old => ({ ...old, [draft.id]: snapshot }));
    go("form", { campaignId: c.id, claimId: draft.id });
  };
  const start = () => { if (!campaign) return; if (!logged || !session) go("login", { claimId: "" }); else void run(() => createDraft(campaign, session)); };
  const track = () => requestLeave(() => { setReference(""); setSearchReference(""); go("tracker", { claimId: "" }); });
  const openClaim = (row: Claim) => go(row.reviewStatus === "Draft" ? "form" : "case", { claimId: row.id, campaignId: row.data.campaignId, market: row.data.market });
  const current = campaigns.filter(c => new Date(c.data.claimEnd).getTime() >= Date.now());
  const past = campaigns.filter(c => new Date(c.data.claimEnd).getTime() < Date.now());
  const claimResults = claims.filter(row => !searchReference || row.reference.toLowerCase() === searchReference.toLowerCase());
  const needsCampaign = ["promotion", "faq", "terms", "privacy"].includes(route.view);
  const unavailable = !loading && ((needsCampaign && !selectedCampaign) || (["form", "case"].includes(route.view) && logged && (!claim || !selectedCampaign)));
  const documents = (view: "faq" | "terms" | "privacy") => {
    if (selectedCampaign) go(view);
    else go("portal", { campaignId: "", claimId: "" });
  };
  return <div lang="en" className={`reference-public ${isPortal ? "ref-portal-page" : "ref-dark-page"}`}>
    <a className="ref-skip-link" href="#ref-main" onClick={e => { e.preventDefault(); main.current?.focus(); main.current?.scrollIntoView({ block: "start" }); }}>Skip to main content</a>
    <dialog ref={leaveDialog} className="ref-leave-dialog" aria-labelledby="ref-leave-title" aria-describedby="ref-leave-description" onCancel={e => { e.preventDefault(); setPendingLeave(null); }}><h2 id="ref-leave-title">Leave without saving?</h2><p id="ref-leave-description">Your latest changes have not been saved. Stay here to save your draft, or discard these changes and leave.</p><div className="actions"><button autoFocus className="button button-light" onClick={() => setPendingLeave(null)}>Stay and save</button><button className="button button-danger" onClick={() => { dirty.current = false; pendingLeave?.(); setPendingLeave(null); }}>Discard changes and leave</button></div></dialog>
    <div className="ref-compare-bar"><a href="/" onClick={e => { e.preventDefault(); requestLeave(() => window.location.assign("/")); }}>← {t("Current version")}</a><span>{t("Reference design comparison")} · {t("Sample environment")}</span><a href={`${urls.admin.replace(/\/$/, "")}/reference/`} onClick={e => { e.preventDefault(); const href = e.currentTarget.href; requestLeave(() => window.location.assign(href)); }}>{t("Administration ↗")}</a></div>
    {isPortal ? <header className="ref-portal-header"><h1>GIGABYTE<sup>™</sup></h1></header> : <nav className="ref-page-nav" aria-label="Promotion navigation"><button onClick={() => go("portal", { campaignId: "", claimId: "" })}>GIGABYTE</button><div>{campaign && <button onClick={() => go("promotion", { claimId: "" })}>Promotion</button>}<button onClick={() => go("countries", { claimId: "" })}>{marketNames[route.market] ?? route.market} ▾</button><button onClick={track}>Claim tracker</button>{campaign && <button onClick={() => documents("faq")}>FAQ</button>}<label><span className="ref-sr-only">Application form language</span><select aria-label="Application form language" value={locale} onChange={e => setLocale(e.target.value === "zh-TW" ? "zh-TW" : "en")}><option value="en">English</option><option value="zh-TW">繁體中文</option></select></label>{logged && <button disabled={busy} onClick={() => requestLeave(() => { void run(async () => { await api.logout(); setSession(await api.session()); setClaims([]); setSnapshots({}); go("portal", { campaignId: "", claimId: "" }); }); })}>Sign out</button>}</div></nav>}
    {!isPortal && route.view !== "countries" && <Artwork campaign={selectedCampaign} />}
    <main id="ref-main" ref={main} tabIndex={-1} className={isPortal ? "ref-portal-main" : "ref-main ref-diagonal"}>
      {loading && <p className="ref-notice" role="status">Loading promotions…</p>}
      {error && <div className="ref-notice ref-error" role="alert"><p>{t(error)}</p><button className="button button-light" disabled={busy} onClick={() => void run(reload)}>Retry loading data</button></div>}
      {message && <p className="ref-notice" role="status">{t(message)}</p>}
      {unavailable && <Content title="Page unavailable"><p>This promotion or claim is unavailable. Return to the portal to choose an available promotion.</p><button className="ref-button" onClick={() => go("portal", { campaignId: "", claimId: "" })}>Promotion portal</button></Content>}
      {isPortal && !loading && <><h2>Ongoing promotions</h2><div className="ref-offers">{current.map(c => <ReferenceCard key={c.id} campaign={c} onOpen={() => go("countries", { campaignId: c.id, claimId: "" })} />)}</div>{!current.length && <p className="ref-portal-empty">No ongoing published promotions are currently available.</p>}<h2>Past promotions</h2><div className="ref-offers">{past.map(c => <ReferenceCard key={c.id} campaign={c} onOpen={() => go("countries", { campaignId: c.id, claimId: "" })} />)}</div>{!past.length && <p className="ref-portal-empty">No past published promotions are currently available.</p>}<button className="ref-text-link" onClick={track}>Track your claim</button></>}
      {route.view === "countries" && !loading && <section className="ref-country-panel"><h1>Please select your country</h1><div className="ref-countries">{markets.filter(market => !campaign || campaign.data.markets.includes(market)).map(market => <button key={market} onClick={() => { const matching = campaign ?? campaigns.find(c => c.data.markets.includes(market)); if (matching) go("promotion", { market, campaignId: matching.id, claimId: "" }); else { go("portal", { market, campaignId: "", claimId: "" }); } }}><Flag market={market} /><span>{marketNames[market] ?? market}</span></button>)}</div>{campaign && !markets.some(market => campaign.data.markets.includes(market)) && <p>No configured markets are available for this promotion.</p>}</section>}
      {route.view === "promotion" && campaign && <ReferencePromotion key={campaign.id + route.market} campaign={campaign} market={route.market} busy={busy} onStart={start} onTrack={track} onTerms={() => documents("terms")} onAccount={() => logged ? track() : go("login", { campaignId: "" })} />}
      {route.view === "login" && <Content title="Your cashback workspace"><div className="ref-translucent"><p>Sign in to save an application and view your claims.</p>{session?.development ? <><p>This sample environment uses the existing evaluation identity.</p><button className="ref-button" disabled={busy} onClick={() => void run(async () => { const identity = await api.login("public"); setSession(identity); await loadClaims(); if (campaign) await createDraft(campaign, identity); else go("tracker", { claimId: "" }); })}>{busy ? "Signing in…" : "Sign in for development"}</button></> : <p>Sign-in is not available in this environment. Contact the promotion support team for access.</p>}{campaign?.data.supportEmail && <p><a href={`mailto:${campaign.data.supportEmail}`}>{campaign.data.supportEmail}</a></p>}</div></Content>}
      {route.view === "form" && claim && selectedCampaign && logged && <div lang={locale === "zh-TW" ? "zh-Hant" : "en"} className="ref-claim-form" onChangeCapture={() => { dirty.current = true; }} onClickCapture={event => { const button = event.target instanceof Element ? event.target.closest("button") : null; if (button && !button.disabled && [t("Add product"), t("Remove product")].includes(button.textContent?.trim() ?? "")) dirty.current = true; }}><ClaimForm key={claim.id} claim={claim} campaign={selectedCampaign} onSaved={saved => { dirty.current = false; updateClaim(saved); }} onBack={track} /></div>}
      {["form", "case"].includes(route.view) && !logged && !loading && <Content title="Sign in to view your claim"><button className="ref-button" onClick={() => go("login")}>Sign in</button></Content>}
      {route.view === "tracker" && <Content title="Claim tracker"><div className="ref-tracker-intro ref-translucent"><p>Check the status of your claim below using the reference number received upon registration.</p><p>Sign in to view your claims, submit additional details and update your bank details.</p>{campaign && <button className="ref-text-link" onClick={() => documents("faq")}>Frequently Asked Questions</button>}</div><form className="ref-tracker-search ref-translucent" onSubmit={e => { e.preventDefault(); const value = reference.trim(); if (!value) { setReferenceError("Enter the reference number from your claim confirmation."); referenceInput.current?.focus(); return; } setReferenceError(""); setSearchReference(value); if (!logged) { go("login", { campaignId: "" }); return; } }}><h2>Check the status of your claim</h2><label className="field"><span>Reference number: *</span><input ref={referenceInput} required name="claimReference" autoComplete="off" spellCheck={false} aria-invalid={Boolean(referenceError)} aria-describedby="reference-help" value={reference} onChange={e => { setReference(e.target.value); setReferenceError(""); }} /></label><p id="reference-help" className={referenceError ? "ref-field-error" : "ref-field-help"} role={referenceError ? "alert" : undefined}>{referenceError || "Use the full reference number shown in your claim confirmation."}</p><button className="ref-button" disabled={busy || loading}>{busy ? "Loading…" : "Search claims"}</button></form>{!logged ? <div className="ref-tracker-signin"><button className="ref-text-link" onClick={() => go("login", { campaignId: "" })}>Sign in to my claims</button></div> : <section className="ref-claim-results"><div className="ref-result-head"><h2>{searchReference ? "Search results" : "My claims"}</h2><button className="ref-text-link" disabled={busy} onClick={() => void run(reload)}>Refresh</button>{searchReference && <button className="ref-text-link" onClick={() => { setSearchReference(""); setReference(""); }}>Show all claims</button>}</div><div className="table-wrap" tabIndex={0} role="region" aria-label="Your claim results"><table><caption className="ref-sr-only">Claims in your account</caption><thead><tr><th scope="col">Reference number</th><th scope="col">Promotion</th><th scope="col">Registration status</th><th scope="col">Transaction status</th><th scope="col">Cashback</th><th scope="col">Action</th></tr></thead><tbody>{claimResults.map(row => <tr key={row.id}><td>{row.reference}<small>{date(row.submittedAt ?? row.createdAt)}</small></td><td>{snapshots[row.id]?.data.name ?? row.data.campaignId}</td><td><Badge>{row.reviewStatus}</Badge>{row.onHold && <Badge>OnHold</Badge>}</td><td><Badge>{row.paymentStatus}</Badge></td><td>{money(row.amountMinor, row.currency)}</td><td><button className="ref-text-link" onClick={() => openClaim(row)}>{row.reviewStatus === "Draft" ? "Continue draft" : "View claim"}</button></td></tr>)}</tbody></table></div>{!claimResults.length && <p role="status" aria-live="polite">{searchReference ? "No claim with this reference was found in your account." : "You have no claims yet."}</p>}</section>}</Content>}
      {route.view === "case" && claim && selectedCampaign && logged && <Content title={claim.reference}><div className="ref-case-status"><Badge>{claim.reviewStatus}</Badge><Badge>{claim.paymentStatus}</Badge>{claim.onHold && <Badge>OnHold</Badge>}<button className="ref-text-link" onClick={track}>Back to my claims</button></div><Panel title="Application summary"><p>{selectedCampaign.data.name}</p><p>{claim.data.firstName} {claim.data.lastName} · {claim.data.email}</p><p>{claim.data.items.length} products · {money(claim.amountMinor, claim.currency)}</p><p>Invoice {claim.data.invoiceNumber} · {claim.data.purchaseDate.slice(0, 10)}</p>{claim.reviewStatus === "MoreInfoRequired" && <button className="ref-button" onClick={() => go("form")}>Provide requested information</button>}</Panel>{claim.paymentStatus === "None" && !["Cancelled", "Rejected"].includes(claim.reviewStatus) && <BankChange claim={claim} onSaved={updateClaim} />}<Panel title="Contact support"><ActionForm disabled={busy} label="Add case message" onSubmit={reason => run(async () => updateClaim(await api.claimAction(claim.id, { action: "message", reason })), "Your message was recorded.")} /></Panel>{!["Rejected", "Cancelled"].includes(claim.reviewStatus) && <Panel title="Cancellation request"><p>Cancellation is completed only when there is no payment risk. Otherwise contact support for investigation.</p><ActionForm disabled={busy} label="Request cancellation" onSubmit={reason => run(async () => updateClaim(await api.claimAction(claim.id, { action: "cancel", reason })), "Cancellation recorded.")} /></Panel>}<Panel title="Timeline"><ol className="ref-timeline">{[...claim.history].reverse().map(event => <li key={event.id}><b>{event.action}</b><p>{event.reason}</p><time>{date(event.createdAt)}</time></li>)}</ol></Panel></Content>}
      {route.view === "faq" && selectedCampaign && <Content title="Frequently Asked Questions"><FaqContent campaign={selectedCampaign} />{selectedCampaign.data.supportEmail && <p className="ref-support">Need help? <a href={`mailto:${selectedCampaign.data.supportEmail}`}>{selectedCampaign.data.supportEmail}</a></p>}</Content>}
      {route.view === "terms" && selectedCampaign && <Content title="Terms and Conditions"><p>Version {selectedCampaign.data.termsVersion}</p><div className="ref-legal pre-wrap">{selectedCampaign.data.terms || "Terms have not been provided for this promotion."}</div></Content>}
      {route.view === "privacy" && selectedCampaign && <Content title="Privacy Policy"><div className="ref-legal pre-wrap">{selectedCampaign.data.privacy || "Privacy notice has not been provided for this promotion."}</div></Content>}
    </main>
    <footer className="ref-footer"><span>©{new Date().getFullYear()} GIGA-BYTE Technology Co., Ltd. All rights reserved.</span><div>{selectedCampaign && <><button onClick={() => documents("terms")}>Terms and Conditions</button><span>|</span><button onClick={() => documents("privacy")}>Privacy Policy</button><span>|</span></>}<button onClick={() => go("countries", { claimId: "" })}>◎ {marketNames[route.market] ?? route.market} (English)</button></div></footer>
  </div>;
}
