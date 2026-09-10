import { useLocale } from "./i18n";
import { useEffect, useState } from "react";
import {
  financeApi,
  type Payment,
  type PaymentAttempt,
  type Reconciliation,
} from "@gigabyte-cashback/api-client";
import {
  Panel,
  Field,
  ActionForm,
  money,
  date,
  Badge,
  Empty,
} from "@gigabyte-cashback/ui";
export function Batches({
  payments,
  busy,
  run,
  reload,
}: {
  payments: Payment[];
  busy: boolean;
  run: (fn: () => Promise<unknown>, message: string) => Promise<void>;
  reload: () => Promise<void>;
}) {
  const { t } = useLocale();
  const [id, setId] = useState("");
  const [reference, setReference] = useState("");
  const batches = [...new Set(payments.map((p) => p.batchId))];
  return (
    <Panel title={t("Batch delivery")}>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t("Batch ID")}</th>
              <th>{t("Instructions")}</th>
              <th>{t("Totals by currency")}</th>
              <th>{t("Delivery")}</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((batchId) => {
              const rows = payments.filter((p) => p.batchId === batchId);
              return (
                <tr key={batchId}>
                  <td>
                    <code>{batchId}</code>
                  </td>
                  <td>{rows.length}</td>
                  <td>
                    {[...new Set(rows.map((p) => p.currency))].map((c) => (
                      <div key={c}>
                        {money(
                          rows
                            .filter((p) => p.currency === c)
                            .reduce((sum, p) => sum + p.amountMinor, 0),
                          c,
                        )}
                      </div>
                    ))}
                  </td>
                  <td>
                    <div className="actions">
                      <a
                        className="button button-light"
                        href={financeApi.batchExport(batchId)}
                      >
                        {t("CSV + manifest ZIP")}{" "}
                      </a>
                      <button
                        className="button button-light"
                        disabled={
                          busy || rows.some((p) => p.status !== "Authorized")
                        }
                        onClick={() => setId(batchId)}
                      >
                        {t("Record batch delivery")}{" "}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!batches.length && <Empty>{t("No batches yet.")}</Empty>}
      {id && (
        <>
          <h3>
            {t("Deliver batch")} {id}
          </h3>
          <Field
            label={t("Delivery reference")}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
          <ActionForm
            reasonLabel={t("Reason / reference")}
            label={t("Mark original instructions submitted")}
            disabled={busy || !reference}
            onSubmit={(reason) =>
              run(async () => {
                await financeApi.submitBatch(id, {
                  action: "submitted",
                  reason,
                  reference,
                });
                setId("");
                await reload();
              }, t("Batch delivery recorded. No bank API was called."))
            }
          />
        </>
      )}
    </Panel>
  );
}
export function FinanceHistory({
  paymentId,
  refreshKey,
}: {
  paymentId?: string;
  refreshKey: string;
}) {
  const { t } = useLocale();
  const [rows, setRows] = useState<Reconciliation[]>([]);
  const [attempts, setAttempts] = useState<PaymentAttempt[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    Promise.all([
      financeApi.reconciliations(),
      paymentId ? financeApi.attempts(paymentId) : Promise.resolve([]),
    ])
      .then(([r, a]) => {
        if (active) {
          setRows(r);
          setAttempts(a);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [paymentId, refreshKey]);
  return (
    <>
      {paymentId && (
        <Panel title={t("Payment attempts")}>
          <ol className="timeline">
            {attempts.map((a) => (
              <li key={a.id}>
                <b>
                  {t("Attempt")} {a.number}
                  {t("·")} <Badge label={t(a.status)}>{a.status}</Badge>
                </b>
                <p>{a.reason}</p>
                <small>
                  {a.reference}
                  {t("·")} {date(a.createdAt)}
                </small>
              </li>
            ))}
          </ol>
        </Panel>
      )}
      <Panel title={t("Reconciliation receipts")}>
        {error && <p className="message error">{t(error)}</p>}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("Timestamp")}</th>
                <th>{t("External payment ID")}</th>
                <th>{t("Reference")}</th>
                <th>{t("Amount")}</th>
                <th>{t("Result")}</th>
                <th>{t("Match status")}</th>
                <th>{t("Reason")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{date(r.createdAt)}</td>
                  <td>
                    <code>{r.paymentId}</code>
                  </td>
                  <td>{r.reference}</td>
                  <td>{money(r.amountMinor, r.currency)}</td>
                  <td>{t(r.result)}</td>
                  <td>
                    <Badge label={t(r.matchStatus)}>{r.matchStatus}</Badge>
                  </td>
                  <td>{r.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <Empty>
            {t(
              "No result receipts. Unmatched IDs and mismatched amounts are retained here for investigation.",
            )}{" "}
          </Empty>
        )}
      </Panel>
    </>
  );
}
