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
export function App() {
  const [session, setSession] = useState<Session>();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [view, setView] = useState("campaigns");
  const [market, setMarket] = useState("DE");
  const [campaignId, setCampaignId] = useState("");
  const [claimId, setClaimId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const campaign = campaigns.find((c) => c.id === campaignId);
  const claim = claims.find((c) => c.id === claimId);
  const logged = Boolean(session?.isAuthenticated);
  const reload = useCallback(async () => {
    setCampaigns(await api.campaigns());
    const s = await api.session();
    setSession(s);
    if (s.isAuthenticated) setClaims(await api.claims());
  }, []);
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
    <>
      <div className="uat-banner">
        Internal evaluation · use synthetic personal and bank details
      </div>
      <header className="topbar">
        <div className="brand">
          GIGABYTE <small>CASHBACK</small>
        </div>
        <nav>
          <button
            className="button button-dark"
            onClick={() => setView("campaigns")}
          >
            Promotions
          </button>
          <button
            className="button button-dark"
            onClick={() => {
              setView(logged ? "claims" : "login");
              setCampaignId("");
            }}
          >
            My claims
          </button>
          <a href={urls.admin}>Administration ↗</a>
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
                    setView("campaigns");
                  })
                }
              >
                Sign out
              </button>
            </>
          ) : (
            <button
              className="button button-light"
              onClick={() => setView("login")}
            >
              Sign in
            </button>
          )}
        </nav>
      </header>
      <main className="public-main">
        {error && (
          <p className="message error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="message" role="status">
            {message}
          </p>
        )}
        {view === "login" && (
          <section className="panel login-panel">
            <Badge>Development access</Badge>
            <h1 style={{ marginTop: 20 }}>Your cashback workspace</h1>
            <p>
              Continue with the evaluation identity to save and track your
              claims.
            </p>
            <button
              className="button button-primary"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  setSession(await api.login("public"));
                  setClaims(await api.claims());
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
              {busy ? "Signing in…" : "Sign in for development"}
            </button>
            <small>yoyo.chen@gigabyte.com</small>
            <small>Google sign-in will be connected in a later release.</small>
          </section>
        )}
        {view === "campaigns" && (
          <>
            <div className="page-head">
              <div>
                <h1>Cashback promotions</h1>
                <p>Explore eligible products and claim your reward.</p>
              </div>
              <select
                className="filter"
                aria-label="Promotion market"
                value={market}
                onChange={(e) => setMarket(e.target.value)}
              >
                {markets.map((m) => (
                  <option key={m} value={m}>
                    {marketNames[m]}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid">
              {campaigns
                .filter((c) => c.data.markets.includes(market))
                .map((c) => (
                  <article className="card" key={c.id}>
                    <div className="campaign-accent" />
                    <Badge>{c.data.status}</Badge>
                    <h2>{c.data.name}</h2>
                    <p>{c.data.description}</p>
                    <dl>
                      <dt className="muted">Purchase period</dt>
                      <dd style={{ marginLeft: 0 }}>
                        {c.data.purchaseStart.slice(0, 10)} –{" "}
                        {c.data.purchaseEnd.slice(0, 10)}
                      </dd>
                      <dt className="muted">Claim deadline</dt>
                      <dd style={{ marginLeft: 0 }}>
                        {c.data.claimEnd.slice(0, 10)} ({c.data.timeZone})
                      </dd>
                    </dl>
                    <p>
                      <b>
                        Up to{" "}
                        {money(
                          Math.max(
                            0,
                            ...c.data.products.map((p) => p.cashbackMinor),
                          ),
                          c.data.currency,
                        )}
                      </b>{" "}
                      per eligible product
                    </p>
                    <button
                      className="button button-primary"
                      onClick={() => {
                        setCampaignId(c.id);
                        setView("detail");
                      }}
                    >
                      View promotion
                    </button>
                  </article>
                ))}
            </div>
            {!campaigns.filter((c) => c.data.markets.includes(market))
              .length && <Empty>No published campaigns for this market.</Empty>}
          </>
        )}
        {view === "detail" && campaign && (
          <>
            <div className="page-head">
              <div>
                <Badge>{campaign.data.type}</Badge>
                <h1>{campaign.data.name}</h1>
                <p>{campaign.data.description}</p>
              </div>
              <button
                className="button button-primary"
                disabled={
                  busy ||
                  !campaign.data.acceptingClaims ||
                  campaign.availableMinor <= 0
                }
                onClick={() => void run(() => start(campaign))}
              >
                {campaign.data.acceptingClaims && campaign.availableMinor > 0
                  ? "Start claim"
                  : "Currently not accepting claims"}
              </button>
            </div>
            <div className="metrics">
              <div className="metric">
                <span>Purchase period</span>
                <strong style={{ fontSize: "1rem" }}>
                  {campaign.data.purchaseStart.slice(0, 10)} –{" "}
                  {campaign.data.purchaseEnd.slice(0, 10)}
                </strong>
              </div>
              <div className="metric">
                <span>Application period</span>
                <strong style={{ fontSize: "1rem" }}>
                  {campaign.data.claimStart.slice(0, 10)} –{" "}
                  {campaign.data.claimEnd.slice(0, 10)}
                </strong>
              </div>
              <div className="metric">
                <span>Waiting period</span>
                <strong>{campaign.data.waitingDays} days</strong>
              </div>
            </div>
            <Panel title="Eligible products">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Series</th>
                      <th>Product / SKU</th>
                      <th>Category</th>
                      <th>Cashback</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaign.data.products.map((p) => (
                      <tr key={p.id}>
                        <td>{p.series}</td>
                        <td>
                          {p.model}
                          <br />
                          <small>{p.id}</small>
                        </td>
                        <td>{p.category}</td>
                        <td>
                          {money(p.cashbackMinor, campaign.data.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
            <Panel title="Participating retailers">
              <div className="grid">
                {campaign.data.retailers.map((r) => (
                  <div key={r.id}>
                    <b>{r.name}</b>
                    <p>{r.country}</p>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel title="Terms, privacy & help">
              <details>
                <summary>Terms — version {campaign.data.termsVersion}</summary>
                <p className="pre-wrap">{campaign.data.terms}</p>
              </details>
              <details>
                <summary>Privacy notice</summary>
                <p className="pre-wrap">{campaign.data.privacy}</p>
              </details>
              <details>
                <summary>Frequently asked questions</summary>
                <p className="pre-wrap">{campaign.data.faq}</p>
              </details>
              {campaign.data.supportEmail && (
                <p>
                  Support:{" "}
                  <a href={`mailto:${campaign.data.supportEmail}`}>
                    {campaign.data.supportEmail}
                  </a>
                </p>
              )}
            </Panel>
          </>
        )}
        {view === "form" && claim && campaign && (
          <ClaimForm
            key={claim.id}
            claim={claim}
            campaign={campaign}
            onSaved={update}
            onBack={() => setView("claims")}
          />
        )}
        {view === "claims" && (
          <>
            <div className="page-head">
              <div>
                <h1>My claims</h1>
                <p>
                  Track reviews, provide information and follow payment
                  outcomes.
                </p>
              </div>
              <button
                className="button button-light"
                disabled={busy}
                onClick={() => void run(reload)}
              >
                Refresh
              </button>
            </div>
            <Panel title="Your applications">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Reference</th>
                      <th>Promotion</th>
                      <th>Review</th>
                      <th>Payment</th>
                      <th>Reward</th>
                      <th>Action</th>
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
                          {campaigns.find((x) => x.id === c.data.campaignId)
                            ?.data.name ?? c.data.campaignId}
                        </td>
                        <td>
                          <Badge>{c.reviewStatus}</Badge>
                          {c.onHold && <Badge>OnHold</Badge>}
                        </td>
                        <td>
                          <Badge>{c.paymentStatus}</Badge>
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
                              ? "Continue draft"
                              : "View case"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!claims.length && (
                <Empty>No claims yet. Choose a promotion to start.</Empty>
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
                  <Badge>{claim.reviewStatus}</Badge>{" "}
                  <Badge>{claim.paymentStatus}</Badge>{" "}
                  {claim.onHold && <Badge>OnHold</Badge>}
                </p>
              </div>
              <button
                className="button button-light"
                onClick={() => setView("claims")}
              >
                Back to my claims
              </button>
            </div>
            <div className="split">
              <div>
                <Panel title="Application summary">
                  <p>
                    {claim.data.firstName} {claim.data.lastName} ·{" "}
                    {claim.data.email}
                  </p>
                  <p>
                    {claim.data.items.length} products ·{" "}
                    {money(claim.amountMinor, claim.currency)}
                  </p>
                  <p>
                    Invoice {claim.data.invoiceNumber} ·{" "}
                    {claim.data.purchaseDate.slice(0, 10)}
                  </p>
                  {claim.reviewStatus === "MoreInfoRequired" && (
                    <button
                      className="button button-primary"
                      onClick={() => setView("form")}
                    >
                      Provide requested information
                    </button>
                  )}
                </Panel>
                {claim.paymentStatus === "None" &&
                  !["Cancelled", "Rejected"].includes(claim.reviewStatus) && (
                    <BankChange claim={claim} onSaved={update} />
                  )}
                <Panel title="Contact support">
                  <ActionForm
                    label="Add case message"
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
                  <Panel title="Cancellation request">
                    <p className="muted">
                      Cancellation is only completed if there is no payment
                      risk. Otherwise contact support for investigation.
                    </p>
                    <ActionForm
                      label="Request cancellation"
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
              <Panel title="Timeline">
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
      <footer className="footer">GIGABYTE Cashback · Sample environment</footer>
    </>
  );
}
