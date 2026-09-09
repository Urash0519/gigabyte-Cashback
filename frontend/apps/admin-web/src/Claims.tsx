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
    }, "Case updated and recorded in its history.");
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Claims</h1>
          <p>Review evidence, resolve exceptions and record decisions.</p>
        </div>
        {c && (
          <button className="button button-light" onClick={() => setId("")}>
            Back to claims
          </button>
        )}
      </div>
      {!c ? (
        <Panel title="Case queue">
          <div className="toolbar">
            <input
              className="filter"
              aria-label="Search customer or reference"
              placeholder="Customer, reference, invoice, SN"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="filter"
              aria-label="Review status"
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
                <option key={x}>{x}</option>
              ))}
            </select>
            <input
              className="filter"
              aria-label="Residence country"
              placeholder="Residence country e.g. DE"
              value={market}
              onChange={(e) => setMarket(e.target.value.toUpperCase())}
            />
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Claim</th>
                  <th>Customer</th>
                  <th>Promotion / country</th>
                  <th>Review</th>
                  <th>Payment</th>
                  <th>Items / reward</th>
                  <th>Submitted</th>
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
                      <Badge>{c.reviewStatus}</Badge>
                      {c.onHold && <Badge>OnHold</Badge>}
                    </td>
                    <td>
                      <Badge>{c.paymentStatus}</Badge>
                    </td>
                    <td>
                      {c.data.items.length} / {money(c.amountMinor, c.currency)}
                    </td>
                    <td>{date(c.submittedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!rows.length && <Empty>No claims match this filter.</Empty>}
        </Panel>
      ) : (
        <>
          <div className="metrics">
            <div className="metric">
              <span>Claim reference</span>
              <strong style={{ fontSize: "1.15rem" }}>{c.reference}</strong>
            </div>
            <div className="metric">
              <span>Review</span>
              <strong>
                <Badge>{c.reviewStatus}</Badge>{" "}
                {c.onHold && <Badge>OnHold</Badge>}
              </strong>
            </div>
            <div className="metric">
              <span>Payment</span>
              <strong>
                <Badge>{c.paymentStatus}</Badge>
              </strong>
            </div>
            <div className="metric">
              <span>Claim reward</span>
              <strong>{money(c.amountMinor, c.currency)}</strong>
            </div>
          </div>
          <div className="split">
            <div>
              <Panel title="Applicant and purchase">
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
                    "Terms accepted": String(c.data.termsAccepted),
                    "Privacy accepted": String(c.data.privacyAccepted),
                    "Marketing consent": String(c.data.marketingAccepted),
                  }).map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{v || "—"}</dd>
                    </div>
                  ))}
                </dl>
              </Panel>
              <Panel title="Products">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Series / product</th>
                        <th>Serial / check number</th>
                        <th>Reward</th>
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
              <Panel title="Evidence">
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
                      <Badge>{a.kind}</Badge>
                      <p>
                        <small>
                          {a.size} bytes · {a.scanStatus} {a.productId}
                        </small>
                      </p>
                    </div>
                  ))
                ) : (
                  <Empty>No uploaded evidence.</Empty>
                )}
              </Panel>
              <Panel title="Payment profile (masked)">
                <dl className="details">
                  {Object.entries(c.data.bank).map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{v || "—"}</dd>
                    </div>
                  ))}
                </dl>
              </Panel>
            </div>
            <div>
              <Panel title="Review action">
                <p className="muted">
                  Complete each required check before approval. A hold blocks
                  approval and payment submission.
                </p>
                <SelectField
                  label="Action"
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
                      {l}
                    </option>
                  ))}
                </SelectField>
                {action === "check" && (
                  <SelectField
                    label="Required check"
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
                      <option key={x}>{x}</option>
                    ))}
                  </SelectField>
                )}
                <ActionForm
                  label="Record action"
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
              <Panel title="Case history">
                <ol className="timeline">
                  {[...c.history].reverse().map((e) => (
                    <li key={e.id}>
                      <b>{e.action}</b>
                      <p>{e.reason}</p>
                      <time>
                        {date(e.createdAt)} · {e.actor}
                      </time>
                    </li>
                  ))}
                </ol>
              </Panel>
              <Revisions claim={c} />
              <Panel title="Rule snapshot">
                <p>
                  Version ID:{" "}
                  <code>{c.campaignVersionId ?? "Not submitted"}</code>
                </p>
                <details>
                  <summary>View submitted campaign rules</summary>
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
