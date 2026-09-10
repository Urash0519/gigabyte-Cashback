import { useLocale } from "./i18n";
import { useState } from "react";
import { Revisions } from "./Revisions";
import {
  api,
  type Campaign,
  type Claim,
  type Action,
} from "@gigabyte-cashback/api-client";
import {
  Field,
  SelectField,
  Panel,
  Badge,
  Empty,
  money,
  date,
  ActionForm,
} from "@gigabyte-cashback/ui";
type Props = {
  claims: Claim[];
  campaigns: Campaign[];
  run: (fn: () => Promise<unknown>, message: string) => Promise<void>;
  reload: () => Promise<void>;
  busy: boolean;
};
export function Claims({ claims, campaigns, run, reload, busy }: Props) {
  const { t } = useLocale();
  const [id, setId] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [market, setMarket] = useState("");
  const [action, setAction] = useState("check");
  const [check, setCheck] = useState("membership");
  const c = claims.find((c) => c.id === id);
  const campaign = campaigns.find((p) => p.id === c?.data.campaignId);
  const version =
    campaign?.versions.find((v) => v.id === c?.campaignVersionId)?.data ??
    campaign?.data;
  const rows = claims.filter(
    (c) =>
      (status === "All" ||
        (status === "Hold" ? c.onHold : c.reviewStatus === status)) &&
      (!market || c.data.residenceCountry === market) &&
      `${c.reference} ${c.data.email} ${c.data.firstName} ${c.data.lastName} ${c.data.invoiceNumber} ${c.data.items.map((i) => i.serialNumber)}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const act = (input: Action) =>
    run(async () => {
      await api.claimAction(id, input);
      await reload();
    }, t("Case updated and recorded in its history."));
  return (
    <>
      <div className="page-head">
        <div>
          <h1>{t("Claims")}</h1>
          <p>
            {t("Review evidence, resolve exceptions and record decisions.")}
          </p>
        </div>
        {c && (
          <button className="button button-light" onClick={() => setId("")}>
            {t("Back to claims")}{" "}
          </button>
        )}
      </div>
      {!c ? (
        <Panel title={t("Case queue")}>
          <div className="toolbar">
            <input
              className="filter"
              aria-label={t("Search customer or reference")}
              placeholder={t("Customer, reference, invoice, SN")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="filter"
              aria-label={t("Review status")}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {[
                "All",
                "Submitted",
                "UnderReview",
                "MoreInfoRequired",
                "Approved",
                "Rejected",
                "Cancelled",
                "Hold",
                "Draft",
              ].map((x) => (
                <option key={x} value={x}>
                  {t(x)}
                </option>
              ))}
            </select>
            <input
              className="filter"
              aria-label={t("Residence country")}
              placeholder={t("Residence country e.g. DE")}
              value={market}
              onChange={(e) => setMarket(e.target.value.toUpperCase())}
            />
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("Claim")}</th>
                  <th>{t("Customer")}</th>
                  <th>{t("Promotion / country")}</th>
                  <th>{t("Review")}</th>
                  <th>{t("Payment")}</th>
                  <th>{t("Items / reward")}</th>
                  <th>{t("Submitted")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <button
                        className="link-button"
                        onClick={() => setId(c.id)}
                      >
                        {c.reference}
                      </button>
                    </td>
                    <td>
                      {c.data.firstName} {c.data.lastName}
                      <br />
                      <small>{c.data.email}</small>
                    </td>
                    <td>
                      {
                        campaigns.find((p) => p.id === c.data.campaignId)?.data
                          .name
                      }
                      <br />
                      {c.data.residenceCountry}
                    </td>
                    <td>
                      <Badge label={t(c.reviewStatus)}>{c.reviewStatus}</Badge>
                      {c.onHold && <Badge label={t("OnHold")}>OnHold</Badge>}
                    </td>
                    <td>
                      <Badge label={t(c.paymentStatus)}>
                        {c.paymentStatus}
                      </Badge>
                    </td>
                    <td>
                      {c.data.items.length}
                      {t("/")} {money(c.amountMinor, c.currency)}
                    </td>
                    <td>{date(c.submittedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!rows.length && <Empty>{t("No claims match this filter.")}</Empty>}
        </Panel>
      ) : (
        <>
          <div className="metrics">
            <div className="metric">
              <span>{t("Claim reference")}</span>
              <strong style={{ fontSize: "1.15rem" }}>{c.reference}</strong>
            </div>
            <div className="metric">
              <span>{t("Review")}</span>
              <strong>
                <Badge label={t(c.reviewStatus)}>{c.reviewStatus}</Badge>{" "}
                {c.onHold && <Badge label={t("OnHold")}>OnHold</Badge>}
              </strong>
            </div>
            <div className="metric">
              <span>{t("Payment")}</span>
              <strong>
                <Badge label={t(c.paymentStatus)}>{c.paymentStatus}</Badge>
              </strong>
            </div>
            <div className="metric">
              <span>{t("Claim reward")}</span>
              <strong>{money(c.amountMinor, c.currency)}</strong>
            </div>
          </div>
          <div className="split">
            <div>
              <Panel title={t("Applicant and purchase")}>
                <dl className="details">
                  {Object.entries({
                    Name: `${c.data.title} ${c.data.firstName} ${c.data.lastName}`,
                    Email: c.data.email,
                    Mobile: c.data.phone,
                    Address: [
                      c.data.address1,
                      c.data.address2,
                      c.data.city,
                      c.data.state,
                      c.data.postcode,
                    ]
                      .filter(Boolean)
                      .join(", "),
                    "Residence country": c.data.residenceCountry,
                    "Purchase country": c.data.purchaseCountry,
                    "Bank country": c.data.bankCountry,
                    Language: c.data.language,
                    Invoice: c.data.invoiceNumber,
                    "Purchase date": date(c.data.purchaseDate),
                    "Purchase amount": money(
                      c.data.purchaseAmountMinor,
                      c.currency,
                    ),
                    Retailer:
                      version?.retailers.find((r) => r.id === c.data.retailerId)
                        ?.name ?? c.data.retailerId,
                    "Terms accepted": t(c.data.termsAccepted ? "Yes" : "No"),
                    "Privacy accepted": t(
                      c.data.privacyAccepted ? "Yes" : "No",
                    ),
                    "Marketing consent": t(
                      c.data.marketingAccepted ? "Yes" : "No",
                    ),
                  }).map(([k, v]) => (
                    <div key={k}>
                      <dt>{t(k)}</dt>
                      <dd>{v || "—"}</dd>
                    </div>
                  ))}
                </dl>
              </Panel>
              <Panel title={t("Products")}>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>{t("Series / product")}</th>
                        <th>{t("Serial / check number")}</th>
                        <th>{t("Reward")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {c.data.items.map((item, i) => (
                        <tr key={i}>
                          <td>
                            {
                              version?.products.find(
                                (p) => p.id === item.productId,
                              )?.series
                            }
                            <br />
                            {version?.products.find(
                              (p) => p.id === item.productId,
                            )?.model ?? item.productId}
                          </td>
                          <td>
                            {item.serialNumber}
                            <br />
                            <small>{item.checkNumber}</small>
                          </td>
                          <td>{money(item.amountMinor, c.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
              <Panel title={t("Evidence")}>
                {c.data.attachments.length ? (
                  c.data.attachments.map((a) => (
                    <div className="line-item" key={a.id}>
                      <a
                        href={api.downloadEvidence(c.id, a.id)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {a.fileName}
                      </a>{" "}
                      <Badge label={t(a.kind)}>{a.kind}</Badge>
                      <p>
                        <small>
                          {a.size}
                          {t("bytes ·")} {t(a.scanStatus)} {a.productId}
                        </small>
                      </p>
                    </div>
                  ))
                ) : (
                  <Empty>{t("No uploaded evidence.")}</Empty>
                )}
              </Panel>
              <Panel title={t("Payment profile (masked)")}>
                <dl className="details">
                  {Object.entries(c.data.bank).map(([k, v]) => (
                    <div key={k}>
                      <dt>{t(k)}</dt>
                      <dd>
                        {k === "accountHolderProfileType" ? t(v) : v || "—"}
                      </dd>
                    </div>
                  ))}
                </dl>
              </Panel>
            </div>
            <div>
              <Panel title={t("Review action")}>
                <p className="muted">
                  {t(
                    "Complete each required check before approval. A hold blocks approval and payment submission.",
                  )}{" "}
                </p>
                <SelectField
                  label={t("Action")}
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                >
                  {[
                    ["check", "Record a passed check"],
                    ["approve", "Approve"],
                    ["reject", "Reject"],
                    ["supplement", "Request more information"],
                    ["hold", "Place risk hold"],
                    ["release-hold", "Release hold"],
                    ["message", "Send case message"],
                    ["internal-note", "Internal note"],
                  ].map(([v, l]) => (
                    <option key={v} value={v}>
                      {t(l)}
                    </option>
                  ))}
                </SelectField>
                {action === "check" && (
                  <SelectField
                    label={t("Required check")}
                    value={check}
                    onChange={(e) => setCheck(e.target.value)}
                  >
                    {[
                      "membership",
                      "invoice",
                      "serial",
                      "eligibility",
                      "duplicates",
                      "rma",
                      "evidence",
                    ].map((x) => (
                      <option key={x} value={x}>
                        {t(x)}
                      </option>
                    ))}
                  </SelectField>
                )}
                <ActionForm
                  reasonLabel={t("Reason / reference")}
                  label={t("Record action")}
                  disabled={busy}
                  onSubmit={(reason) =>
                    act({
                      action,
                      reason,
                      value: action === "check" ? check : "",
                    })
                  }
                />
              </Panel>
              <Panel title={t("Case history")}>
                <ol className="timeline">
                  {[...c.history].reverse().map((e) => (
                    <li key={e.id}>
                      <b>
                        {e.action.startsWith("Check:")
                          ? `${t("Check")}: ${t(e.action.slice(6))}`
                          : e.action.startsWith("Payment:")
                            ? `${t("Payment")}: ${t(e.action.slice(8))}`
                            : t(e.action)}
                      </b>
                      <p>{e.reason}</p>
                      <time>
                        {date(e.createdAt)}
                        {t("·")} {e.actor}
                      </time>
                    </li>
                  ))}
                </ol>
              </Panel>
              <Revisions claim={c} />
              <Panel title={t("Rule snapshot")}>
                <p>
                  {t("Version ID:")}{" "}
                  <code>{c.campaignVersionId ?? t("Not submitted")}</code>
                </p>
                <details>
                  <summary>{t("View submitted campaign rules")}</summary>
                  <pre className="pre-wrap">
                    {JSON.stringify(version, null, 2)}
                  </pre>
                </details>
              </Panel>
            </div>
          </div>
        </>
      )}
    </>
  );
}
