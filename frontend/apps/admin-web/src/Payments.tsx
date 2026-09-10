import { useLocale } from "./i18n";
import { useState } from "react";
import { Batches, FinanceHistory } from "./FinanceDetails";
import {
  api,
  financeApi,
  type Claim,
  type Payment,
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
  payments: Payment[];
  claims: Claim[];
  busy: boolean;
  run: (fn: () => Promise<unknown>, message: string) => Promise<void>;
  reload: () => Promise<void>;
};
export function Payments({
  payments,
  claims,
  busy,
  run,
  reload: refresh,
}: Props) {
  const { t } = useLocale();
  const [receiptVersion, setReceiptVersion] = useState(0);
  const reload = async () => {
    await refresh();
    setReceiptVersion((v) => v + 1);
  };
  const [selected, setSelected] = useState<string[]>([]);
  const [id, setId] = useState("");
  const [action, setAction] = useState("submitted");
  const [reference, setReference] = useState("");
  const [resultAmount, setResultAmount] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [status, setStatus] = useState("All");
  const [importText, setImportText] = useState("");
  const eligible = claims.filter(
    (c) =>
      c.reviewStatus === "Approved" &&
      !c.onHold &&
      !payments.some((p) => p.claimId === c.id),
  );
  const p = payments.find((p) => p.id === id);
  const rows = payments.filter((p) => status === "All" || p.status === status);
  return (
    <>
      <div className="page-head">
        <div>
          <h1>{t("Payments & reconciliation")}</h1>
          <p>
            {t(
              "Authorize instructions, record delivery and reconcile confirmed outcomes.",
            )}{" "}
          </p>
        </div>
      </div>
      <p className="message info">
        {t(
          "Manual payment workflow. Exporting a file does not send money or confirm a bank transfer.",
        )}{" "}
      </p>
      <Panel title={t("Approved and ready for authorization")}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("Select")}</th>
                <th>{t("Claim")}</th>
                <th>{t("Applicant")}</th>
                <th>{t("Amount")}</th>
              </tr>
            </thead>
            <tbody>
              {eligible.map((c) => (
                <tr key={c.id}>
                  <td>
                    <input
                      aria-label={t("Authorize {reference}", {
                        reference: c.reference,
                      })}
                      type="checkbox"
                      checked={selected.includes(c.id)}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? [...selected, c.id]
                            : selected.filter((x) => x !== c.id),
                        )
                      }
                    />
                  </td>
                  <td>{c.reference}</td>
                  <td>
                    {c.data.firstName} {c.data.lastName}
                  </td>
                  <td>{money(c.amountMinor, c.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!eligible.length ? (
          <Empty>
            {t(
              "No approved claims without a hold or existing instruction.",
            )}{" "}
          </Empty>
        ) : (
          <ActionForm
            reasonLabel={t("Reason / reference")}
            label={t("Authorize {count} instructions", {
              count: selected.length,
            })}
            disabled={busy || !selected.length}
            onSubmit={(reason) =>
              run(async () => {
                await api.createPayments(selected, reason);
                setSelected([]);
                await reload();
              }, t("Payment instructions authorized. No money has been transferred."))
            }
          />
        )}
      </Panel>
      <Batches payments={payments} busy={busy} run={run} reload={reload} />
      <Panel title={t("Payment instructions")}>
        <div className="toolbar">
          <select
            aria-label={t("Payment status")}
            className="filter"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {[
              "All",
              "Authorized",
              "Submitted",
              "Processing",
              "Unknown",
              "Succeeded",
              "Failed",
            ].map((s) => (
              <option key={s} value={s}>
                {t(s)}
              </option>
            ))}
          </select>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("Instruction / batch")}</th>
                <th>{t("Claim")}</th>
                <th>{t("Status")}</th>
                <th>{t("Amount")}</th>
                <th>{t("Reference / export hash")}</th>
                <th>{t("Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td>
                    <code>{p.id}</code>
                    <br />
                    <small>
                      {t("Batch")} {p.batchId}
                    </small>
                  </td>
                  <td>{claims.find((c) => c.id === p.claimId)?.reference}</td>
                  <td>
                    <Badge label={t(p.status)}>{p.status}</Badge>
                  </td>
                  <td>{money(p.amountMinor, p.currency)}</td>
                  <td>
                    {p.resultReference || "—"}
                    <br />
                    <small>{p.exportSha256 || t("Not exported")}</small>
                  </td>
                  <td>
                    <div className="actions">
                      <button
                        className="button button-light"
                        onClick={() => {
                          setId(p.id);
                          setResultAmount(String(p.amountMinor / 100));
                          setCurrency(p.currency);
                          setReference(p.resultReference);
                          setAction(
                            p.status === "Failed" ? "retry" : "submitted",
                          );
                        }}
                      >
                        {t("Record result")}{" "}
                      </button>
                      <a
                        className="button button-light"
                        href={api.exportPayment(p.id)}
                      >
                        {t("Export CSV")}{" "}
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && <Empty>{t("No payment instructions.")}</Empty>}
      </Panel>
      {p && (
        <Panel
          title={t("Reconcile {reference}", {
            reference:
              claims.find((c) => c.id === p.claimId)?.reference ?? p.id,
          })}
          actions={
            <button className="button button-light" onClick={() => setId("")}>
              {t("Close")}{" "}
            </button>
          }
        >
          <div className="form-grid">
            <SelectField
              label={t("Result / action")}
              value={action}
              onChange={(e) => setAction(e.target.value)}
            >
              {[
                "submitted",
                "processing",
                "unknown",
                "succeeded",
                "failed",
                "retry",
              ].map((s) => (
                <option
                  key={s}
                  value={s}
                  disabled={s === "retry" && p.status !== "Failed"}
                >
                  {t(s)}
                </option>
              ))}
            </SelectField>
            <Field
              label={t("Bank / delivery evidence reference")}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
            <Field
              label={t("Confirmed amount")}
              type="number"
              step="0.01"
              value={resultAmount}
              onChange={(e) => setResultAmount(e.target.value)}
            />
            <Field
              label={t("Currency")}
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            />
          </div>
          {p.status === "Unknown" && (
            <p className="message info">
              {t(
                "Investigate the result and record confirmed success or failure. Retry remains blocked while the outcome is unknown.",
              )}{" "}
            </p>
          )}
          <ActionForm
            reasonLabel={t("Reason / reference")}
            label={t("Record payment result")}
            disabled={busy}
            onSubmit={(reason) =>
              run(async () => {
                if (action === "succeeded" || action === "failed") {
                  const receipt = await financeApi.reconcile({
                    paymentId: p.id,
                    result: action,
                    reason,
                    reference,
                    amountMinor: Math.round(Number(resultAmount) * 100),
                    currency,
                  });
                  await reload();
                  if (receipt.matchStatus !== "Matched")
                    throw new Error(
                      t(receipt.matchStatus) +
                        ": " +
                        t("Result retained for investigation."),
                    );
                } else
                  await api.paymentAction(p.id, {
                    action,
                    reason,
                    reference,
                    amountMinor: Math.round(Number(resultAmount) * 100),
                    currency,
                  });
                await reload();
              }, t("Payment result recorded. Budget and case status refreshed."))
            }
          />
          <small>
            {t("Created")} {date(p.createdAt)}
            {t(
              ". Keep the original instruction ID when retrying a confirmed failure.",
            )}{" "}
          </small>
        </Panel>
      )}
      <FinanceHistory
        paymentId={id || undefined}
        refreshKey={String(receiptVersion)}
      />
      <Panel title={t("Import manual results")}>
        <p className="muted">
          {t(
            "Paste JSON rows with instruction id, action, reason, reference, amountMinor and currency. Each row is validated independently; failed rows remain visible for correction.",
          )}{" "}
        </p>
        <label className="field">
          <span>{t("Result rows")}</span>
          <textarea
            rows={5}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={
              '[{"id":"instruction-id","action":"succeeded","reason":"Bank statement verified","reference":"statement-001","amountMinor":5000,"currency":"EUR"}]'
            }
          />
        </label>
        <button
          className="button button-light"
          disabled={busy || !importText.trim()}
          onClick={() =>
            void run(async () => {
              const rows: unknown = JSON.parse(importText);
              if (!Array.isArray(rows))
                throw new Error(t("Expected an array of result rows."));
              const failures: string[] = [];
              for (const row of rows) {
                if (!row || typeof row.id !== "string" || !row.reason) {
                  failures.push(t("Each row requires id and reason."));
                  continue;
                }
                try {
                  const receipt = await financeApi.reconcile({
                    paymentId: row.id,
                    reference: row.reference,
                    amountMinor: row.amountMinor,
                    currency: row.currency,
                    result: row.action,
                    reason: row.reason,
                  });
                  if (receipt.matchStatus !== "Matched")
                    failures.push(
                      row.id +
                        ": " +
                        t(receipt.matchStatus) +
                        " " +
                        t("(saved for investigation)"),
                    );
                } catch (e) {
                  failures.push(
                    `${row.id}: ${e instanceof Error ? e.message : String(e)}`,
                  );
                }
              }
              await reload();
              if (failures.length) throw new Error(failures.join("\n"));
              setImportText("");
            }, t("All result rows reconciled."))
          }
        >
          {t("Validate and import")}{" "}
        </button>
      </Panel>
    </>
  );
}
