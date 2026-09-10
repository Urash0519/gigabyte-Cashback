import { useLocale } from "./i18n";
import { useState } from "react";
import { type Claim } from "@gigabyte-cashback/api-client";
import { Panel, date, money } from "@gigabyte-cashback/ui";
export function Revisions({ claim }: { claim: Claim }) {
  const { t } = useLocale();
  const [selected, setSelected] = useState("");
  const revision = claim.revisions?.find((r) => r.id === selected);
  return (
    <Panel title={t("Correction history")}>
      <select
        className="filter"
        aria-label={t("Select earlier claim version")}
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
      >
        <option value="">{t("Select a saved version")}</option>
        {claim.revisions?.map((r) => (
          <option key={r.id} value={r.id}>
            {date(r.createdAt)} · {r.reason}
          </option>
        ))}
      </select>
      {revision && (
        <>
          <p>
            {revision.reason} · {money(revision.amountMinor, claim.currency)}
          </p>
          <pre className="pre-wrap">
            {JSON.stringify(
              { ...revision.data, bank: t("Protected payment profile") },
              null,
              2,
            )}
          </pre>
        </>
      )}
    </Panel>
  );
}
