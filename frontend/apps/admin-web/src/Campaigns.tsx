import { useLocale } from "./i18n";
import { useEffect, useState } from "react";
import { CampaignRows } from "./CampaignRows";
import { CampaignTransfer } from "./CampaignTransfer";
import { configuration, downloadText, csvText, utcInputValue, effectiveCampaignRules } from "./campaign-transfer";

const extraLabels: Record<string, string> = {
  id: "Retailer ID",
  name: "Name",
  country: "Country",
  url: "URL",
  series: "Series",
  category: "Category",
  model: "Model",
  ean: "EAN",
  description: "Description",
  terms: "Terms",
  privacy: "Privacy notice",
  faq: "FAQs",
  markets: "Markets",
  languages: "Languages",
  currency: "Currency",
  purchaseStart: "Purchase start",
  purchaseEnd: "Purchase end",
  claimStart: "Claim start",
  claimEnd: "Claim end",
  waitingDays: "Waiting days",
  budgetMinor: "Budget (minor units)",
  bufferMinor: "Buffer (minor units)",
  claimLimit: "Claim capacity",
  termsVersion: "Terms version",
  products: "Products",
  retailers: "Retailers",
  reviewSlaDays: "Review SLA (days)",
  supplementSlaDays: "Supplement SLA (days)",
  paymentSlaDays: "Payment SLA (days)",
  maxClaimsPerHousehold: "Claims per household",
  exclusivityGroup: "Mutually exclusive campaign group",
  owner: "Campaign owner",
  costCenter: "Cost center",
  year: "Campaign year",
  quarter: "Campaign quarter",
  privacyVersion: "Privacy notice version",
  notificationTemplateVersion: "Notification template version",
};
import {
  api,
  blankCampaign,
  configurationApi,
  markets,
  urls,
  type Campaign,
  type CampaignInput,
  type ConfigurationValidation,
} from "@gigabyte-cashback/api-client";
import {
  Field,
  SelectField,
  TextField,
  Panel,
  Badge,
  money,
  ActionForm,
  Empty,
} from "@gigabyte-cashback/ui";
type Props = {
  campaigns: Campaign[];
  run: (action: () => Promise<unknown>, message: string) => Promise<void>;
  reload: () => Promise<void>;
  busy: boolean;
};
export function Campaigns({ campaigns, run, reload, busy }: Props) {
  const { t } = useLocale();
  const [editing, setEditing] = useState<Campaign | "new" | null>(null);
  const [draft, setDraft] = useState<CampaignInput>(blankCampaign);
  const [status, setStatus] = useState("All");
  const [search, setSearch] = useState("");
  const [compare, setCompare] = useState<string[]>([]);
  const [tab, setTab] = useState("Details");
  const [preflight, setPreflight] = useState<{ fingerprint: string; result: ConfigurationValidation } | null>(null);
  const [validationError, setValidationError] = useState("");
  const fingerprint = JSON.stringify(configuration(draft));
  const editorOpen = Boolean(editing);
  const isDirty = editing === "new" || (editing !== null && fingerprint !== JSON.stringify(configuration(editing.data)));
  const validated = preflight?.fingerprint === fingerprint;
  const canPublish = validated && preflight.result.errors.length === 0 && !isDirty;
  useEffect(() => {
    if (!editorOpen) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setValidationError("");
      configurationApi.validate((JSON.parse(fingerprint) as { data: CampaignInput }).data).then(result => {
        if (!cancelled) setPreflight({ fingerprint, result });
      }).catch((error: Error) => { if (!cancelled) setValidationError(error.message); });
    }, 450);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [fingerprint, editorOpen]);
  function changeRule(key: "maxClaimsPerHousehold" | "exclusivityGroup", value: string) {
    const legacyFields = { ...draft.legacyFields };
    delete legacyFields[key];
    setDraft({ ...draft, [key]: key === "maxClaimsPerHousehold" ? Number(value) : value, legacyFields });
  }
  function edit(c: Campaign | "new") {
    setEditing(c);
    setDraft(
      c === "new"
        ? blankCampaign()
        : { ...structuredClone(c.data), concurrencyStamp: c.concurrencyStamp },
    );
    setTab("Details");
  }
  const field = (key: keyof CampaignInput, label: string, type = "text") => (
    <Field
      key={key}
      label={t(label)}
      type={type}
      value={String(draft[key])}
      onChange={(e) =>
        setDraft({
          ...draft,
          [key]: type === "number" ? Number(e.target.value) : e.target.value,
        })
      }
    />
  );
  const rows = campaigns.filter(
    (c) =>
      (status === "All" || c.data.status === status) &&
      `${c.data.name} ${c.data.markets}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="page-head">
        <div>
          <h1>{t("Campaigns")}</h1>
          <p>
            {t(
              "Configure promotions, publish versions and monitor commitments.",
            )}
          </p>
        </div>
        <button
          className="button button-primary"
          disabled={busy}
          onClick={() => edit("new")}
        >
          {" "}
          {t("Create campaign")}{" "}
        </button>
      </div>
      {editing ? (
        <Panel
          title={editing === "new" ? t("New campaign") : draft.name}
          actions={
            <button
              className="button button-light"
              onClick={() => setEditing(null)}
            >
              {" "}
              {t("Back to campaigns")}{" "}
            </button>
          }
        >
          <CampaignTransfer
            key={editing === "new" ? "new" : editing.id}
            draft={draft}
            editing={editing}
            busy={busy}
            onImported={async (saved) => { edit(saved); await reload(); }}
            onTemplate={(data) => { setEditing("new"); setDraft(data); setTab("Details"); }}
          />
          <div className="tabs">
            {["Details", "Products", "Retailers", "Content", "Preflight", "Versions"].map(
              (tabName) => (
                <button
                  key={tabName}
                  className={tab === tabName ? "active" : ""}
                  onClick={() => setTab(tabName)}
                >
                  {t(tabName)}
                </button>
              ),
            )}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                const saved =
                  editing === "new"
                    ? await api.createCampaign(draft)
                    : await api.saveCampaign(editing.id, draft);
                setEditing(saved);
                setDraft({
                  ...saved.data,
                  concurrencyStamp: saved.concurrencyStamp,
                });
                await reload();
              }, "Campaign draft saved. Publish to update the public version.");
            }}
          >
            {tab === "Details" && (
              <div className="form-grid">
                {field("name", "Promotion name")}
                {field("slug", "Public URL slug")}
                {field("type", "Promotion type")}
                <SelectField
                  label={t("Administrative status")}
                  value={draft.status}
                  onChange={(e) =>
                    setDraft({ ...draft, status: e.target.value })
                  }
                >
                  {["Draft", "Active", "Confirmed", "Archived"].map((s) => (
                    <option key={s} value={s}>
                      {t(s)}
                    </option>
                  ))}
                </SelectField>
                <fieldset className="market-selection"><legend>{t("Countries")}</legend>{markets.map(market => <label className="check" key={market}><input type="checkbox" checked={draft.markets.includes(market)} onChange={e => { const next = e.target.checked ? markets.filter(m => draft.markets.includes(m) || m === market) : draft.markets.filter(m => m !== market); setDraft({ ...draft, markets: next, market: next[0] || "" }); }} />{market}</label>)}</fieldset>
                <Field
                  label={t("Languages (comma-separated)")}
                  value={draft.languages.join(",")}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      languages: e.target.value.split(",").map((x) => x.trim()),
                    })
                  }
                />
                {field("currency", "Currency")}
                {field("timeZone", "Activity time zone")}
                {(
                  [
                    "purchaseStart",
                    "purchaseEnd",
                    "claimStart",
                    "claimEnd",
                  ] as const
                ).map((key, i) => (
                  <Field
                    key={key}
                    label={t(
                      [
                        "Purchase from (UTC)",
                        "Purchase until (UTC)",
                        "Claims from (UTC)",
                        "Claims until (UTC)",
                      ][i],
                    )}
                    type="datetime-local"
                    value={utcInputValue(draft[key])}
                    required
                    onChange={(e) =>
                      setDraft({ ...draft, [key]: e.target.value + ":00Z" })
                    }
                  />
                ))}
                {field("waitingDays", "Waiting days", "number")}
                {field("maxClaimsPerPerson", "Claims per person", "number")}
                {field("maxItemsPerCategory", "Items per category", "number")}
                <Field label={t("Claims per household")} type="number" min="1" value={effectiveCampaignRules(draft).maxClaimsPerHousehold} onChange={e => changeRule("maxClaimsPerHousehold", e.target.value)} />
                <Field label={t("Mutually exclusive campaign group")} value={effectiveCampaignRules(draft).exclusivityGroup} onChange={e => changeRule("exclusivityGroup", e.target.value)} />
                {field("claimLimit", "Claim capacity", "number")}
                {(["budgetMinor", "bufferMinor"] as const).map((key) => (
                  <Field
                    key={key}
                    label={t(
                      key === "budgetMinor"
                        ? "Budget ({currency})"
                        : "Buffer ({currency})",
                      { currency: draft.currency },
                    )}
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft[key] / 100}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        [key]: Math.round(Number(e.target.value) * 100),
                      })
                    }
                  />
                ))}
                {[
                  "reviewSlaDays",
                  "supplementSlaDays",
                  "paymentSlaDays",
                  "owner",
                  "costCenter",
                  "year",
                  "quarter",
                  "privacyVersion",
                  "notificationTemplateVersion",
                ].map((key) => (
                  <Field
                    key={key}
                    label={t(extraLabels[key] ?? key)}
                    value={draft.legacyFields[key] ?? ""}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        legacyFields: {
                          ...draft.legacyFields,
                          [key]: e.target.value,
                        },
                      })
                    }
                  />
                ))}
                <label className="check full">
                  <input
                    type="checkbox"
                    checked={draft.acceptingClaims}
                    onChange={(e) =>
                      setDraft({ ...draft, acceptingClaims: e.target.checked })
                    }
                  />{" "}
                  {t(
                    "Accept new claims (subject to periods and remaining budget)",
                  )}{" "}
                </label>
              </div>
            )}
            {(tab === "Products" || tab === "Retailers") && (
              <CampaignRows key={`${editing === "new" ? "new" : editing.id}-${tab}`} kind={tab === "Products" ? "products" : "retailers"} draft={draft} onChange={setDraft} />
            )}
            {tab === "Content" && (
              <div className="form-grid">
                {field("termsVersion", "Terms version")}
                {field("supportEmail", "Support email")}
                {field("bannerUrl", "Banner URL")}
                {(["description", "terms", "privacy", "faq"] as const).map(
                  (key) => (
                    <TextField
                      key={key}
                      label={t(extraLabels[key] ?? key)}
                      value={draft[key]}
                      onChange={(value) => setDraft({ ...draft, [key]: value })}
                    />
                  ),
                )}
              </div>
            )}
            {tab === "Versions" &&
              (editing === "new" ? (
                <Empty>
                  {t("Save the draft before publishing a version.")}
                </Empty>
              ) : (
                <>
                  <p>
                    {t(
                      "Published version: {version}. Submitted claims retain their original version; drafts can apply the latest published rules.",
                      { version: editing.publishedVersion },
                    )}
                  </p>
                  {editing.versions.map((v) => (
                    <details key={v.id}>
                      <summary>
                        {t("Version {version} · {date}", {
                          version: v.version,
                          date: v.createdAt,
                        })}
                      </summary>
                      <pre className="pre-wrap">
                        {JSON.stringify(v.data, null, 2)}
                      </pre>
                    </details>
                  ))}
                </>
              ))}
            {tab === "Preflight" && <section className="preflight">
              <h3>{t("Draft readiness checklist")}</h3>
              <p>{t("Draft summary uses the current editor, including unsaved changes. Publishing requires a saved draft and successful server validation.")}</p>
              <dl className="preflight-summary"><div><dt>{t("Countries")}</dt><dd>{draft.markets.join(", ")} · {draft.currency}</dd></div><div><dt>{t("Products")}</dt><dd>{draft.products.length}</dd></div><div><dt>{t("Retailers")}</dt><dd>{draft.retailers.length}</dd></div><div><dt>{t("Purchase period")}</dt><dd>{draft.purchaseStart} – {draft.purchaseEnd}</dd></div><div><dt>{t("Claim period")}</dt><dd>{draft.claimStart} – {draft.claimEnd}</dd></div><div><dt>{t("Languages")}</dt><dd>{draft.languages.join(", ")}</dd></div></dl>
              {validationError && <p className="error" role="alert">{validationError}</p>}
              {!validated && !validationError && <p role="status">{t("Validating configuration…")}</p>}
              {validated && <>
                <p className={preflight.result.errors.length ? "error" : "success"}>{t("{errors} errors / {warnings} warnings", { errors: preflight.result.errors.length, warnings: preflight.result.warnings.length })}</p>
                {[...preflight.result.errors.map(issue => ({ ...issue, severity: "Error" })), ...preflight.result.warnings.map(issue => ({ ...issue, severity: "Warning" }))].map((issue, i) => <p key={i}><b>{t(issue.severity)}</b> · <code>{issue.path}</code> — {issue.message}</p>)}
                <button type="button" className="button button-light" onClick={() => downloadText("draft-preflight.csv", csvText(["severity", "path", "message"], [...preflight.result.errors.map(i => ({ ...i, severity: "error" })), ...preflight.result.warnings.map(i => ({ ...i, severity: "warning" }))]), "text/csv;charset=utf-8")}>{t("Download validation report")}</button>
              </>}
              {editing !== "new" && editing.publishedVersion > 0 && <p><a href={urls.public} target="_blank" rel="noreferrer">{t("Open public site (published content only; unsaved draft is not shown)")}</a></p>}
            </section>}
            <div className="actions" style={{ marginTop: 24 }}>
              <button disabled={busy} className="button button-primary">
                {" "}
                {t("Save draft")}{" "}
              </button>
            </div>
          </form>
          <p className="muted" role="status">{isDirty ? t("Unsaved changes: save the draft before publishing.") : !validated ? t("Server validation pending. Review Preflight before publishing.") : preflight.result.errors.length ? t("Resolve the errors in Preflight before publishing.") : t("Saved draft is ready for publication. Review any Preflight warnings.")}</p>
          {editing !== "new" && (
            <ActionForm
              reasonLabel={t("Reason / reference")}
              label={t("Publish saved version")}
              disabled={busy || !canPublish}
              onSubmit={(reason) =>
                run(async () => {
                  const c = await api.publishCampaign(editing.id, reason);
                  setEditing(c);
                  setDraft({ ...c.data, concurrencyStamp: c.concurrencyStamp });
                  await reload();
                }, "Campaign version published.")
              }
            />
          )}
        </Panel>
      ) : (
        <>
          <Panel title={t("Promotions")}>
            <div className="toolbar">
              <input
                className="filter"
                aria-label={t("Search campaigns")}
                placeholder={t("Search promotion or country")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="filter"
                aria-label={t("Campaign status")}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {["All", "Active", "Confirmed", "Archived", "Draft"].map(
                  (s) => (
                    <option key={s} value={s}>
                      {t(s)}
                    </option>
                  ),
                )}
              </select>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t("Compare")}</th>
                    <th>{t("Promotion name")}</th>
                    <th>{t("Type / status")}</th>
                    <th>{t("Period (UTC)")}</th>
                    <th>{t("Countries")}</th>
                    <th>{t("Available / budget")}</th>
                    <th>{t("Actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <input
                          aria-label={t("Compare {name}", {
                            name: c.data.name,
                          })}
                          type="checkbox"
                          checked={compare.includes(c.id)}
                          disabled={
                            !compare.includes(c.id) && compare.length >= 2
                          }
                          onChange={(e) =>
                            setCompare(
                              e.target.checked
                                ? [...compare, c.id]
                                : compare.filter((id) => id !== c.id),
                            )
                          }
                        />
                      </td>
                      <td>
                        <b>{c.data.name}</b>
                        <small>
                          {" "}
                          {t("Version {version}", {
                            version: c.publishedVersion,
                          })}{" "}
                          · {c.data.slug}
                        </small>
                      </td>
                      <td>
                        {c.data.type}
                        <br />
                        <Badge label={t(c.data.status)}>{c.data.status}</Badge>
                      </td>
                      <td>
                        {c.data.purchaseStart.slice(0, 10)}
                        <br />
                        {c.data.purchaseEnd.slice(0, 10)}
                      </td>
                      <td>{c.data.markets.join(", ")}</td>
                      <td>
                        {money(c.availableMinor, c.data.currency)}
                        <small>
                          {" "}
                          / {money(c.data.budgetMinor, c.data.currency)}
                        </small>
                      </td>
                      <td>
                        <div className="actions">
                          <button
                            className="button button-light"
                            onClick={() => edit(c)}
                          >
                            {" "}
                            {t("Edit")}{" "}
                          </button>
                          <button
                            disabled={busy}
                            className="button button-light"
                            onClick={() =>
                              void run(async () => {
                                const copy = await api.copyCampaign(c.id);
                                await reload();
                                edit(copy);
                              }, "Campaign copied as a draft.")
                            }
                          >
                            {" "}
                            {t("Copy")}{" "}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!rows.length && (
              <Empty>{t("No campaigns match this filter.")}</Empty>
            )}
          </Panel>
          {compare.length === 2 && (
            <Panel title={t("Compare campaigns")}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{t("Dimension")}</th>
                      {compare.map((id) => (
                        <th key={id}>
                          {campaigns.find((c) => c.id === id)?.data.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(
                      [
                        "markets",
                        "languages",
                        "currency",
                        "purchaseStart",
                        "purchaseEnd",
                        "claimStart",
                        "claimEnd",
                        "waitingDays",
                        "budgetMinor",
                        "bufferMinor",
                        "claimLimit",
                        "termsVersion",
                        "products",
                        "retailers",
                        "terms",
                      ] as const
                    ).map((key) => (
                      <tr key={key}>
                        <th>{t(extraLabels[key] ?? key)}</th>
                        {compare.map((id) => (
                          <td key={id} className="pre-wrap">
                            {JSON.stringify(
                              campaigns.find((c) => c.id === id)?.data[key],
                              null,
                              2,
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}
        </>
      )}
    </>
  );
}
