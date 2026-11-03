import { useEffect, useState } from "react";
import { api, type AorusMemberReference as MemberReference } from "@gigabyte-cashback/api-client";
import { date } from "@gigabyte-cashback/ui";
import { useLocale } from "./i18n";

type State = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: MemberReference };

export function AorusMemberReference({ claimId }: { claimId: string }) {
  const { t } = useLocale();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State>({ status: "loading" });
  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    void api.aorusMemberReference(claimId, controller.signal).then(data => {
      if (!controller.signal.aborted) setState({ status: "ready", data });
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setState({ status: "error", message: error instanceof Error ? error.message : String(error) });
    });
    return () => controller.abort();
  }, [claimId, attempt]);
  const data = state.status === "ready" ? state.data : null;
  return <section className="aorus-member-reference" aria-label={t("AORUS member reference")} aria-busy={state.status === "loading"}>
    <div className="aorus-member-head">
      <h3>{t("AORUS member reference")}</h3>
      <button type="button" className="button button-light" disabled={state.status === "loading"} onClick={() => setAttempt(value => value + 1)}>{t("Refresh member details")}</button>
    </div>
    {state.status === "loading" && <p role="status">{t("Checking AORUS member details…")}</p>}
    {state.status === "error" && <p className="message error" role="alert">{t(state.message)}</p>}
    {data && <dl className="details">
      <div><dt>{t("AORUS member name")}</dt><dd className="aorus-member-name">{data.isMember === true ? data.name || t("Name not returned") : "—"}</dd></div>
      <div><dt>{t("AORUS membership")}</dt><dd>{t(data.isMember === null ? "AORUS lookup is not enabled" : data.isMember ? "AORUS member found" : "No AORUS member found")}</dd></div>
      <div><dt>{t("Checked email")}</dt><dd>{data.email}</dd></div>
      <div><dt>{t("Checked at")}</dt><dd>{date(data.checkedAt)}</dd></div>
    </dl>}
    <p className="muted">{t("AORUS member details are provided for review reference.")}</p>
  </section>;
}
