import { useCallback, useEffect, useState } from "react";
import {
  api,
  urls,
  blankClaim,
  marketNames,
  markets,
  type Campaign,
  type Claim,
  type Session,
} from "@gigabyte-cashback/api-client";
import {
  Panel,
  Badge,
  Empty,
  money,
  date,
  ActionForm,
} from "@gigabyte-cashback/ui";
import { ClaimForm } from "./ClaimForm";
import { BankChange } from "./BankChange";
import { Promotions, PromotionDetails } from "./Promotions";
import "./public.css";
import { useLocale } from "./i18n";
export function App() {
  const { locale, setLocale, t } = useLocale();
  const [session, setSession] = useState<Session>();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [claimCampaigns, setClaimCampaigns] = useState<
    Record<string, Campaign>
  >({});
  const [view, setView] = useState("campaigns");
  const [market, setMarket] = useState("DE");
  const [campaignId, setCampaignId] = useState("");
  const [claimId, setClaimId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [view]);
  const campaign = campaigns.find((c) => c.id === campaignId);
  const claim = claims.find((c) => c.id === claimId);
  const claimCampaign = claimCampaigns[claimId] ?? campaign;
  const logged = Boolean(session?.isAuthenticated);
  const loadClaims = useCallback(async () => {
    const rows = await api.claims();
    // Fetch once per pinned version. These owner-only snapshots never enter discovery.
    const versions = [
      ...new Map(rows.map((c) => [c.campaignVersionId, c])).values(),
    ];
    const entries = await Promise.all(
      versions.map(
        async (c) =>
          [c.campaignVersionId, await api.claimCampaign(c.id)] as const,
      ),
    );
    const snapshots = new Map(entries);
    setClaimCampaigns(
      Object.fromEntries(
        rows.map((c) => [c.id, snapshots.get(c.campaignVersionId)!]),
      ),
    );
    setClaims(rows);
  }, []);
  const reload = useCallback(async () => {
    setCampaigns(await api.campaigns());
    const s = await api.session();
    setSession(s);
    if (s.isAuthenticated) await loadClaims();
  }, [loadClaims]);
  useEffect(() => {
    void reload().catch((e) => setError(e.message));
  }, [reload]);
  const run = async (fn: () => Promise<void>, success = "") => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
      setMessage(success);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  const update = (saved: Claim) =>
    setClaims((old) =>
      old.some((c) => c.id === saved.id)
        ? old.map((c) => (c.id === saved.id ? saved : c))
        : [saved, ...old],
    );
  const start = async (c: Campaign) => {
    setCampaignId(c.id);
    if (!logged) {
      setView("login");
      return;
    }
    const draft = await api.createClaim({
      ...blankClaim(c.id),
      market,
      residenceCountry: market,
      purchaseCountry: market,
      bankCountry: market,
    });
    update(draft);
    setClaimId(draft.id);
    setView("form");
  };
  return (
    <div className="cashback-public">
      <div className="uat-banner">
        {" "}
        {t(
          "Internal evaluation · use synthetic personal and bank details",
        )}{" "}
      </div>
      <header className="topbar">
        <button
          className="brand public-brand"
          aria-label={t("GIGABYTE Cashback home")}
          onClick={() => setView("campaigns")}
        >
          GIGABYTE <small>{t("CASHBACK")}</small>
        </button>
        <nav aria-label={t("Main navigation")}>
          <button
            className={`public-nav-link ${["campaigns", "detail"].includes(view) ? "active" : ""}`}
            onClick={() => setView("campaigns")}
          >
            {" "}
            {t("Cashback offers")}{" "}
          </button>
          <button
            className={`public-nav-link ${["claims", "case"].includes(view) ? "active" : ""}`}
            onClick={() => {
              setView(logged ? "claims" : "login");
              setCampaignId("");
            }}
          >
            {" "}
            {t("My claims")}{" "}
          </button>
          <label className="public-market">
            <span className="market-code">{market}</span>
            <select
              aria-label={t("Promotion market")}
              value={market}
              disabled={view === "form"}
              onChange={(e) => {
                setMarket(e.target.value);
                setView("campaigns");
              }}
            >
              {markets.map((m) => (
                <option key={m} value={m}>
                  {t(marketNames[m])}
                </option>
              ))}
            </select>
          </label>
          <label className="public-language">
            <span>{t("Interface language")}</span>
            <select
              aria-label={t("Interface language")}
              value={locale}
              onChange={(e) =>
                setLocale(e.target.value === "zh-TW" ? "zh-TW" : "en")
              }
            >
              <option value="en">{t("English")}</option>
              <option value="zh-TW">繁體中文</option>
            </select>
          </label>
          <a href={urls.admin}>{t("Administration ↗")}</a>
          {logged ? (
            <>
              <span className="identity">{session?.email}</span>
              <button
                className="button button-light"
                onClick={() =>
                  void run(async () => {
                    await api.logout();
                    setSession(await api.session());
                    setClaims([]);
                    setClaimCampaigns({});
                    setView("campaigns");
                  })
                }
              >
                {" "}
                {t("Sign out")}{" "}
              </button>
            </>
          ) : (
            <button
              className="button button-light"
              onClick={() => setView("login")}
            >
              {" "}
              {t("Sign in")}{" "}
            </button>
          )}
        </nav>
      </header>
      <main
        className={
          view === "campaigns" || view === "detail"
            ? "promotion-main"
            : "public-main"
        }
      >
        {error && (
          <p className="message error" role="alert">
            {t(error)}
          </p>
        )}
        {message && (
          <p className="message" role="status">
            {t(message)}
          </p>
        )}
        {view === "login" && (
          <section className="panel login-panel">
            <Badge>{t("Development access")}</Badge>
            <h1 style={{ marginTop: 20 }}>{t("Your cashback workspace")}</h1>
            <p>
              {" "}
              {t(
                "Continue with the evaluation identity to save and track your claims.",
              )}{" "}
            </p>
            <button
              className="button button-primary"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  setSession(await api.login("public"));
                  await loadClaims();
                  if (campaign) {
                    const draft = await api.createClaim({
                      ...blankClaim(campaign.id),
                      market,
                      residenceCountry: market,
                      purchaseCountry: market,
                      bankCountry: market,
                    });
                    update(draft);
                    setClaimId(draft.id);
                    setView("form");
                  } else setView("claims");
                })
              }
            >
              {busy ? t("Signing in…") : t("Sign in for development")}
            </button>
            <small>yoyo.chen@gigabyte.com</small>
            <small>
              {t("Google sign-in will be connected in a later release.")}
            </small>
          </section>
        )}
        {view === "campaigns" && (
          <Promotions
            campaigns={campaigns}
            market={market}
            onOpen={(c) => {
              setCampaignId(c.id);
              setView("detail");
            }}
            onTrack={() => {
              setCampaignId("");
              setView(logged ? "claims" : "login");
            }}
          />
        )}
        {view === "detail" && campaign && (
          <PromotionDetails
            key={campaign.id + market}
            campaign={campaign}
            market={market}
            busy={busy}
            onBack={() => setView("campaigns")}
            onStart={() => void run(() => start(campaign))}
          />
        )}
        {view === "form" && claim && claimCampaign && (
          <ClaimForm
            key={claim.id}
            claim={claim}
            campaign={claimCampaign}
            onSaved={update}
            onBack={() => setView("claims")}
          />
        )}
        {view === "claims" && (
          <>
            <div className="page-head">
              <div>
                <h1>{t("My claims")}</h1>
                <p>
                  {" "}
                  {t(
                    "Track reviews, provide information and follow payment outcomes.",
                  )}{" "}
                </p>
              </div>
              <button
                className="button button-light"
                disabled={busy}
                onClick={() => void run(reload)}
              >
                {" "}
                {t("Refresh")}{" "}
              </button>
            </div>
            <Panel title={t("Your applications")}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{t("Reference")}</th>
                      <th>{t("Promotion")}</th>
                      <th>{t("Review")}</th>
                      <th>{t("Payment")}</th>
                      <th>{t("Reward")}</th>
                      <th>{t("Action")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {claims.map((c) => (
                      <tr key={c.id}>
                        <td>
                          {c.reference}
                          <br />
                          <small>{date(c.submittedAt ?? c.createdAt)}</small>
                        </td>
                        <td>
                          {claimCampaigns[c.id]?.data.name ??
                            campaigns.find((x) => x.id === c.data.campaignId)
                              ?.data.name ??
                            c.data.campaignId}
                        </td>
                        <td>
                          <Badge label={t(c.reviewStatus)}>
                            {c.reviewStatus}
                          </Badge>
                          {c.onHold && (
                            <Badge label={t("OnHold")}>OnHold</Badge>
                          )}
                        </td>
                        <td>
                          <Badge label={t(c.paymentStatus)}>
                            {c.paymentStatus}
                          </Badge>
                        </td>
                        <td>{money(c.amountMinor, c.currency)}</td>
                        <td>
                          <button
                            className="button button-light"
                            onClick={() => {
                              setClaimId(c.id);
                              setCampaignId(c.data.campaignId);
                              setView(
                                c.reviewStatus === "Draft" ? "form" : "case",
                              );
                            }}
                          >
                            {c.reviewStatus === "Draft"
                              ? t("Continue draft")
                              : t("View case")}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!claims.length && (
                <Empty>
                  {t("No claims yet. Choose a promotion to start.")}
                </Empty>
              )}
            </Panel>
          </>
        )}
        {view === "case" && claim && (
          <>
            <div className="page-head">
              <div>
                <h1>{claim.reference}</h1>
                <p>
                  <Badge label={t(claim.reviewStatus)}>
                    {claim.reviewStatus}
                  </Badge>{" "}
                  <Badge label={t(claim.paymentStatus)}>
                    {claim.paymentStatus}
                  </Badge>{" "}
                  {claim.onHold && <Badge label={t("OnHold")}>OnHold</Badge>}
                </p>
              </div>
              <button
                className="button button-light"
                onClick={() => setView("claims")}
              >
                {" "}
                {t("Back to my claims")}{" "}
              </button>
            </div>
            <div className="split">
              <div>
                <Panel title={t("Application summary")}>
                  <p>
                    {claim.data.firstName} {claim.data.lastName} ·{" "}
                    {claim.data.email}
                  </p>
                  <p>
                    {claim.data.items.length} {t("products ·")}{" "}
                    {money(claim.amountMinor, claim.currency)}
                  </p>
                  <p>
                    {" "}
                    {t("Invoice")} {claim.data.invoiceNumber} ·{" "}
                    {claim.data.purchaseDate.slice(0, 10)}
                  </p>
                  {claim.reviewStatus === "MoreInfoRequired" && (
                    <button
                      className="button button-primary"
                      onClick={() => setView("form")}
                    >
                      {" "}
                      {t("Provide requested information")}{" "}
                    </button>
                  )}
                </Panel>
                {claim.paymentStatus === "None" &&
                  !["Cancelled", "Rejected"].includes(claim.reviewStatus) && (
                    <BankChange claim={claim} onSaved={update} />
                  )}
                <Panel title={t("Contact support")}>
                  <ActionForm
                    reasonLabel={t("Reason / reference")}
                    label={t("Add case message")}
                    disabled={busy}
                    onSubmit={(reason) =>
                      run(async () => {
                        update(
                          await api.claimAction(claim.id, {
                            action: "message",
                            reason,
                          }),
                        );
                      }, "Your message was recorded.")
                    }
                  />
                </Panel>
                {!["Rejected", "Cancelled"].includes(claim.reviewStatus) && (
                  <Panel title={t("Cancellation request")}>
                    <p className="muted">
                      {" "}
                      {t(
                        "Cancellation is only completed if there is no payment risk. Otherwise contact support for investigation.",
                      )}{" "}
                    </p>
                    <ActionForm
                      reasonLabel={t("Reason / reference")}
                      label={t("Request cancellation")}
                      disabled={busy}
                      onSubmit={(reason) =>
                        run(async () => {
                          update(
                            await api.claimAction(claim.id, {
                              action: "cancel",
                              reason,
                            }),
                          );
                        }, "Cancellation recorded.")
                      }
                    />
                  </Panel>
                )}
              </div>
              <Panel title={t("Timeline")}>
                <ol className="timeline">
                  {[...claim.history].reverse().map((e) => (
                    <li key={e.id}>
                      <b>{e.action}</b>
                      <p>{e.reason}</p>
                      <time>{date(e.createdAt)}</time>
                    </li>
                  ))}
                </ol>
              </Panel>
            </div>
          </>
        )}
      </main>
      <footer className="footer">
        {t("GIGABYTE Cashback · Sample environment")}
      </footer>
    </div>
  );
}
