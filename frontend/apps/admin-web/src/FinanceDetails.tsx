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
  const [id, setId] = useState("");
  const [reference, setReference] = useState("");
  const batches = [...new Set(payments.map((p) => p.batchId))];
  return (
    <Panel title="Batch delivery">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Batch ID</th>
              <th>Instructions</th>
              <th>Totals by currency</th>
              <th>Delivery</th>
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
                        CSV + manifest ZIP
                      </a>
                      <button
                        className="button button-light"
                        disabled={
                          busy || rows.some((p) => p.status !== "Authorized")
                        }
                        onClick={() => setId(batchId)}
                      >
                        Record batch delivery
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!batches.length && <Empty>No batches yet.</Empty>}
      {id && (
        <>
          <h3>Deliver batch {id}</h3>
          <Field
            label="Delivery reference"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
          <ActionForm
            label="Mark original instructions submitted"
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
              }, "Batch delivery recorded. No bank API was called.")
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
        <Panel title="Payment attempts">
          <ol className="timeline">
            {attempts.map((a) => (
              <li key={a.id}>
                <b>
                  Attempt {a.number} · <Badge>{a.status}</Badge>
                </b>
                <p>{a.reason}</p>
                <small>
                  {a.reference} · {date(a.createdAt)}
                </small>
              </li>
            ))}
          </ol>
        </Panel>
      )}
      <Panel title="Reconciliation receipts">
        {error && <p className="message error">{error}</p>}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>External payment ID</th>
                <th>Reference</th>
                <th>Amount</th>
                <th>Result</th>
                <th>Match status</th>
                <th>Reason</th>
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
                  <td>{r.result}</td>
                  <td>
                    <Badge>{r.matchStatus}</Badge>
                  </td>
                  <td>{r.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <Empty>
            No result receipts. Unmatched IDs and mismatched amounts are
            retained here for investigation.
          </Empty>
        )}
      </Panel>
    </>
  );
}
