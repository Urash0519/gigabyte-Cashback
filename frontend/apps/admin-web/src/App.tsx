import { useCallback, useEffect, useState } from "react";
import {
  api,
  urls,
  type Campaign,
  type Claim,
  type Payment,
  type Event,
  type Session,
} from "@gigabyte-cashback/api-client";
import { Panel, Badge, Empty, money, date } from "@gigabyte-cashback/ui";
import { Campaigns } from "./Campaigns";
import { Claims } from "./Claims";
import { Payments } from "./Payments";
import { Reports } from "./Reports";
import { Notifications } from "./Notifications";
import { useLocale } from "./i18n";
const tabs = [
  "Overview",
  "Campaigns",
  "Claims",
  "Payments",
  "Reports",
  "Notifications",
  "Audit",
];
export function App() {
  const { locale, setLocale, t } = useLocale();
  const [session, setSession] = useState<Session>();
  const [tab, setTab] = useState("Overview");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const reload = useCallback(async () => {
    const [c, k, p, e] = await Promise.all([
      api.campaigns(true),
      api.claims(true),
      api.payments(),
      api.audit(),
    ]);
    setCampaigns(c);
    setClaims(k);
    setPayments(p);
    setEvents(e);
  }, []);
  const run = async (fn: () => Promise<unknown>, success: string) => {
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
  useEffect(() => {
    void api
      .session()
      .then(async (s) => {
        setSession(s);
        if (s.isAuthenticated && s.area === "admin") await reload();
      })
      .catch((e) => setError(e.message));
  }, [reload]);
  const logged = Boolean(session?.isAuthenticated && session.area === "admin");
  return (
    <>
      <div className="uat-banner">
        {t(
          "Internal evaluation · sample data only · bank API and Google sign-in are not connected",
        )}{" "}
      </div>
      <header className="topbar">
        <div className="brand">
          GIGABYTE <small>{t("CASHBACK ADMIN")}</small>
        </div>
        <nav>
          <label className="admin-language">
            <span>{t("Interface language")}</span>
            <select
              aria-label={t("Interface language")}
              value={locale}
              onChange={(e) =>
                setLocale(e.target.value === "zh-TW" ? "zh-TW" : "en")
              }
            >
              <option value="en">English</option>
              <option value="zh-TW">繁體中文</option>
            </select>
          </label>
          <a href={urls.public}>{t("Consumer site ↗")}</a>
          {logged && (
            <>
              <span className="identity">{session?.email}</span>
              <button
                className="button button-light"
                onClick={() =>
                  void run(async () => {
                    await api.logout();
                    setSession(await api.session());
                  }, "Signed out.")
                }
              >
                {t("Sign out")}{" "}
              </button>
            </>
          )}
        </nav>
      </header>
      {!logged ? (
        <main className="public-main">
          {error && (
            <p className="message error" role="alert">
              {t(error)}
            </p>
          )}
          <section className="panel login-panel">
            <Badge>{t("Development access")}</Badge>
            <h1 style={{ marginTop: 20 }}>{t("Promotion operations")}</h1>
            <p>
              {t("Manage campaigns, review claims and reconcile payments.")}
            </p>
            <button
              disabled={busy}
              className="button button-primary"
              onClick={() =>
                void run(async () => {
                  setSession(await api.login("admin"));
                  await reload();
                }, "Signed in with the development identity.")
              }
            >
              {busy ? t("Signing in…") : t("Sign in for development")}
            </button>
            <small>yoyo.chen@gigabyte.com</small>
            <small>
              {t("Google sign-in will replace this development button.")}
            </small>
          </section>
        </main>
      ) : (
        <div className="workspace">
          <aside className="sidebar">
            <small>{t("Workspace")}</small>
            {tabs.map((tabName) => (
              <button
                key={tabName}
                className={tab === tabName ? "active" : ""}
                onClick={() => {
                  setTab(tabName);
                  setMessage("");
                }}
              >
                {t(tabName)}
              </button>
            ))}
          </aside>
          <main className="workspace-main">
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
            {busy && (
              <p role="status" className="muted">
                {t("Saving / loading…")}{" "}
              </p>
            )}
            {tab === "Campaigns" && (
              <Campaigns
                campaigns={campaigns}
                run={run}
                reload={reload}
                busy={busy}
              />
            )}
            {tab === "Claims" && (
              <Claims
                claims={claims}
                campaigns={campaigns}
                run={run}
                reload={reload}
                busy={busy}
              />
            )}
            {tab === "Payments" && (
              <Payments
                payments={payments}
                claims={claims}
                run={run}
                reload={reload}
                busy={busy}
              />
            )}
            {tab === "Reports" && <Reports campaigns={campaigns} />}{" "}
            {tab === "Notifications" && <Notifications />}
            {tab === "Overview" && (
              <>
                <div className="page-head">
                  <div>
                    <h1>{t("Operations overview")}</h1>
                    <p>
                      {t(
                        "Current workload and commitments across your campaigns.",
                      )}{" "}
                    </p>
                  </div>
                  <button
                    className="button button-light"
                    disabled={busy}
                    onClick={() => void run(reload, "Overview refreshed.")}
                  >
                    {t("Refresh")}{" "}
                  </button>
                </div>
                <div className="metrics">
                  {[
                    [
                      "Submitted claims",
                      claims.filter((c) => c.reviewStatus !== "Draft").length,
                    ],
                    [
                      "Awaiting review",
                      claims.filter((c) =>
                        ["Submitted", "UnderReview"].includes(c.reviewStatus),
                      ).length,
                    ],
                    [
                      "More information",
                      claims.filter(
                        (c) => c.reviewStatus === "MoreInfoRequired",
                      ).length,
                    ],
                    ["Risk holds", claims.filter((c) => c.onHold).length],
                    [
                      "Payment exceptions",
                      payments.filter((p) =>
                        ["Unknown", "Failed"].includes(p.status),
                      ).length,
                    ],
                  ].map(([label, count]) => (
                    <button
                      className="metric"
                      key={label}
                      onClick={() =>
                        setTab(
                          label === "Payment exceptions"
                            ? "Payments"
                            : "Claims",
                        )
                      }
                    >
                      <span>{t(String(label))}</span>
                      <strong>{count}</strong>
                    </button>
                  ))}
                </div>
                <Panel title={t("Campaign budgets")}>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>{t("Campaign")}</th>
                          <th>{t("Budget")}</th>
                          <th>{t("Buffer")}</th>
                          <th>{t("Reserved")}</th>
                          <th>{t("Approved unpaid")}</th>
                          <th>{t("Paid")}</th>
                          <th>{t("Available")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {campaigns.map((c) => (
                          <tr key={c.id}>
                            <td>
                              {c.data.name}
                              <br />
                              <Badge label={t(c.data.status)}>
                                {c.data.status}
                              </Badge>
                            </td>
                            {[
                              c.data.budgetMinor,
                              c.data.bufferMinor,
                              c.reservedMinor,
                              c.approvedMinor,
                              c.paidMinor,
                              c.availableMinor,
                            ].map((v, i) => (
                              <td key={i} className="money">
                                {money(v, c.data.currency)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {!campaigns.length && (
                    <Empty>{t("Create a campaign to begin.")}</Empty>
                  )}
                </Panel>
                <Panel title={t("Recent activity")}>
                  <ol className="timeline">
                    {events.slice(0, 8).map((e) => (
                      <li key={e.id}>
                        <b>{t(e.action)}</b>
                        <p>{e.reason}</p>
                        <time>
                          {date(e.createdAt)} · {e.actor}
                        </time>
                      </li>
                    ))}
                  </ol>
                </Panel>
              </>
            )}
            {tab === "Audit" && (
              <>
                <div className="page-head">
                  <div>
                    <h1>{t("Audit trail")}</h1>
                    <p>
                      {t(
                        "Recorded business operations, reasons and identities.",
                      )}
                    </p>
                  </div>
                  <button
                    className="button button-light"
                    onClick={() => void run(reload, "Audit refreshed.")}
                  >
                    {t("Refresh")}{" "}
                  </button>
                </div>
                <Panel title={t("Business events")}>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>{t("UTC timestamp")}</th>
                          <th>{t("Actor")}</th>
                          <th>{t("Action")}</th>
                          <th>{t("Target")}</th>
                          <th>{t("Reason")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {events.map((e) => (
                          <tr key={e.id}>
                            <td>{date(e.createdAt)}</td>
                            <td>{e.actor}</td>
                            <td>{t(e.action)}</td>
                            <td>
                              <code>{e.targetId}</code>
                            </td>
                            <td>{e.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {!events.length && (
                    <Empty>{t("No recorded activity.")}</Empty>
                  )}
                </Panel>
              </>
            )}
          </main>
        </div>
      )}
      <footer className="footer">
        {t("GIGABYTE Cashback · Phase 1 operations")}
      </footer>
    </>
  );
}
