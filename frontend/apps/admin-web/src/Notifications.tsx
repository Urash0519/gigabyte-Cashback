import { useCallback, useEffect, useState } from "react";
import { useLocale } from "./i18n";
import { api, type OperationNotification } from "@gigabyte-cashback/api-client";
import { Badge, Empty, Panel, date } from "@gigabyte-cashback/ui";

export function Notifications() {
  const { t } = useLocale();
  const subjectLabel = (subject: string) => {
    const prefix = [
      "Claim received",
      "Claim update",
      "Payment update",
      "Bank details changed",
    ].find((key) => subject.startsWith(key + " "));
    return prefix
      ? `${t(prefix)} ${subject.slice(prefix.length + 1)}`
      : t(subject);
  };
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
          <h1>{t("Notifications")}</h1>
          <p>
            {t(
              "Review queued case updates and record a development processing attempt.",
            )}
          </p>
        </div>
        <button
          className="button button-light"
          disabled={busy}
          onClick={() => void refresh()}
        >
          {t("Refresh")}
        </button>
      </div>
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
      <Panel title={t("Notification outbox")}>
        <p className="heading-note">
          {t(
            "Development simulation only. Processing does not send email or confirm delivery to the recipient.",
          )}
        </p>
        <div className="table-wrap" aria-busy={busy}>
          <table>
            <thead>
              <tr>
                <th>{t("Recipient")}</th>
                <th>{t("Subject / template")}</th>
                <th>{t("Claim ID")}</th>
                <th>{t("Status")}</th>
                <th>{t("Attempts")}</th>
                <th>{t("Processed at")}</th>
                <th>{t("Action")}</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((notification) => (
                <tr key={notification.id}>
                  <td>{notification.recipientMasked}</td>
                  <td>
                    {subjectLabel(notification.subject)}
                    <br />
                    <small>
                      {t("Template")} {notification.templateVersion}
                    </small>
                  </td>
                  <td>
                    <code>{notification.claimId ?? "—"}</code>
                  </td>
                  <td>
                    <Badge label={t(notification.status)}>
                      {notification.status}
                    </Badge>
                  </td>
                  <td>{notification.attempts}</td>
                  <td>{date(notification.processedAt)}</td>
                  <td>
                    <button
                      className="button button-light"
                      disabled={busy}
                      onClick={() => void simulate(notification.id)}
                    >
                      {t(
                        notification.attempts > 0
                          ? "Simulate another attempt"
                          : "Simulate processing",
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!notifications.length && !busy && (
          <Empty>{t("No notifications have been queued.")}</Empty>
        )}
        {busy && <p role="status">{t("Loading / processing…")}</p>}
      </Panel>
    </>
  );
}
