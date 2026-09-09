import { useCallback, useEffect, useState } from "react";
import { api, type OperationNotification } from "@gigabyte-cashback/api-client";
import { Badge, Empty, Panel, date } from "@gigabyte-cashback/ui";

export function Notifications() {
  const [notifications, setNotifications] = useState<OperationNotification[]>(
    [],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    setNotifications(await api.notifications());
  }, []);
  const refresh = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [load]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const simulate = async (id: string) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api.simulateNotification(id);
      await load();
      setMessage("Simulation recorded. No email was delivered.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Notifications</h1>
          <p>
            Review queued case updates and record a development processing
            attempt.
          </p>
        </div>
        <button
          className="button button-light"
          disabled={busy}
          onClick={() => void refresh()}
        >
          Refresh
        </button>
      </div>
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
      <Panel title="Notification outbox">
        <p className="heading-note">
          Development simulation only. Processing does not send email or confirm
          delivery to the recipient.
        </p>
        <div className="table-wrap" aria-busy={busy}>
          <table>
            <thead>
              <tr>
                <th>Recipient</th>
                <th>Subject / template</th>
                <th>Claim ID</th>
                <th>Status</th>
                <th>Attempts</th>
                <th>Processed at</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((notification) => (
                <tr key={notification.id}>
                  <td>{notification.recipientMasked}</td>
                  <td>
                    {notification.subject}
                    <br />
                    <small>Template {notification.templateVersion}</small>
                  </td>
                  <td>
                    <code>{notification.claimId ?? "—"}</code>
                  </td>
                  <td>
                    <Badge>{notification.status}</Badge>
                  </td>
                  <td>{notification.attempts}</td>
                  <td>{date(notification.processedAt)}</td>
                  <td>
                    <button
                      className="button button-light"
                      disabled={busy}
                      onClick={() => void simulate(notification.id)}
                    >
                      {notification.attempts > 0
                        ? "Simulate another attempt"
                        : "Simulate processing"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!notifications.length && !busy && (
          <Empty>No notifications have been queued.</Empty>
        )}
        {busy && <p role="status">Loading / processing…</p>}
      </Panel>
    </>
  );
}
