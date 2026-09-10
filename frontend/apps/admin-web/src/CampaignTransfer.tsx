import { useState } from "react";
import { configurationApi, type Campaign, type CampaignConfiguration, type CampaignInput, type ConfigurationValidation } from "@gigabyte-cashback/api-client";
import { configuration, configurationChanges, downloadText, parseConfiguration, csvText } from "./campaign-transfer";
import { useLocale } from "./i18n";

type Props = {
  draft: CampaignInput;
  editing: Campaign | "new";
  busy: boolean;
  onImported: (campaign: Campaign) => Promise<void>;
  onTemplate: (data: CampaignInput) => void;
};
const templateUrl = `${import.meta.env.BASE_URL}templates/q1-campaign.json`;
export function CampaignTransfer({ draft, editing, busy, onImported, onTemplate }: Props) {
  const { t } = useLocale();
  const [incoming, setIncoming] = useState<CampaignConfiguration | null>(null);
  const [validation, setValidation] = useState<ConfigurationValidation | null>(null);
  const [mode, setMode] = useState("new");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [version, setVersion] = useState("");
  const [template, setTemplate] = useState(false);
  async function prepare(raw: string, isTemplate = false) {
    setError(""); setIncoming(null); setValidation(null); setWorking(true); setTemplate(isTemplate); setReason("");
    try {
      const value = parseConfiguration(raw);
      const checked = await configurationApi.validate(value.data);
      setIncoming(value); setValidation(checked); setMode("new");
    } catch (e) { setError((e as Error).message); }
    finally { setWorking(false); }
  }
  const changes = incoming ? configurationChanges(draft, incoming.data) : [];
  return <section className="campaign-transfer">
    <h3>{t("Configuration import / export")}</h3>
    <p className="muted">{t("JSON includes all campaign settings and reference URLs, not claims, payments, uploaded asset files or publication history. Amounts use integer cents. Import never publishes automatically.")}</p>
    <div className="toolbar">
      <button type="button" className="button button-light" onClick={() => downloadText(`${draft.slug || "campaign"}-editor-draft.json`, JSON.stringify(configuration(draft), null, 2))}>{t("Export editor draft (includes unsaved changes)")}</button>
      {editing !== "new" && editing.versions.length > 0 && <>
        <select aria-label={t("Published version")} value={version} onChange={e => setVersion(e.target.value)}><option value="">{t("Published version")}</option>{editing.versions.map(v => <option key={v.id} value={v.version}>{v.version}</option>)}</select>
        <button type="button" className="button button-light" disabled={!version || working} onClick={async () => {
          setWorking(true); setError("");
          try { downloadText(`${draft.slug}-published-v${version}.json`, JSON.stringify(await configurationApi.export(editing.id, Number(version)), null, 2)); } catch (e) { setError((e as Error).message); } finally { setWorking(false); }
        }}>{t("Export published version")}</button>
      </>}
      <label className="button button-light file-button">{t("Import configuration JSON")}<input type="file" accept=".json,application/json" disabled={working || busy} onChange={async e => { const file = e.target.files?.[0]; e.target.value = ""; if (file) { if (file.size > 5 * 1024 * 1024) { setError(t("File exceeds the 5 MB import limit.")); return; } try { await prepare(await file.text()); } catch (error) { setError((error as Error).message); } } }} /></label>
      <a className="button button-light" href={templateUrl} download>{t("Download Q1 template")}</a>
      <button type="button" className="button button-light" disabled={working || busy} onClick={async () => {
        setError(""); setWorking(true);
        try { const response = await fetch(templateUrl); if (!response.ok) throw new Error(t("Q1 template could not be loaded.")); await prepare(await response.text(), true); } catch (e) { setError((e as Error).message); setWorking(false); }
      }}>{t("Use Q1 template")}</button>
    </div>
    {working && <p role="status">{t("Validating configuration…")}</p>}
    {error && <p className="error" role="alert">{error}</p>}
    {incoming && validation && <div className="import-preview">
      <h4>{t("Review before applying")}: {incoming.data.name}</h4>
      {template ? <p>{t("This historical Q1 sample opens as a new unsaved editor. Review dates, legal text, budget and simulation notes before saving.")}</p> : <label>{t("Import destination")} <select value={mode} onChange={e => setMode(e.target.value)}><option value="new">{t("Create a new draft")}</option>{editing !== "new" && <option value="replace">{t("Replace this campaign's saved draft")}</option>}</select></label>}
      <p>{t("Compared with the current editor: {count} changed fields.", { count: changes.length })}</p>
      <div className="table-wrap configuration-diff"><table><thead><tr><th>{t("Field")}</th><th>{t("Current editor")}</th><th>{t("Imported value")}</th></tr></thead><tbody>{changes.map(change => <tr key={change.path}><th>{change.path}</th><td><pre>{JSON.stringify(change.before, null, 2)}</pre></td><td><pre>{JSON.stringify(change.after, null, 2)}</pre></td></tr>)}</tbody></table></div>
      {[...validation.errors.map(issue => ({ ...issue, severity: "Error" })), ...validation.warnings.map(issue => ({ ...issue, severity: "Warning" }))].map((issue, i) => <p key={i} className={issue.severity === "Error" ? "error" : "muted"}>{t(issue.severity)} · <code>{issue.path}</code> — {issue.message}</p>)}
      {(validation.errors.length > 0 || validation.warnings.length > 0) && <button type="button" className="button button-light" onClick={() => downloadText("configuration-validation.csv", csvText(["severity", "path", "message"], [...validation.errors.map(i => ({ ...i, severity: "error" })), ...validation.warnings.map(i => ({ ...i, severity: "warning" }))]), "text/csv;charset=utf-8")}>{t("Download validation report")}</button>}
      {!template && <label className="field">{t("Reason / reference")}<input value={reason} onChange={e => setReason(e.target.value)} /></label>}
      {!template && mode === "replace" && <p className="error">{t("Replaces the saved draft and discards current unsaved editor changes. Published versions and claims remain unchanged.")}</p>}
      <div className="actions"><button type="button" className="button button-primary" disabled={working || busy || validation.errors.length > 0 || (!template && !reason.trim())} onClick={async () => {
        if (template) { onTemplate({ ...incoming.data, status: "Draft", acceptingClaims: false, concurrencyStamp: undefined }); setIncoming(null); return; }
        setWorking(true); setError("");
        try { const saved = await configurationApi.import(incoming, reason, mode === "replace" && editing !== "new" ? editing.id : undefined, mode === "replace" && editing !== "new" ? editing.concurrencyStamp : undefined); await onImported(saved); setIncoming(null); } catch (e) { setError((e as Error).message); } finally { setWorking(false); }
      }}>{template ? t("Open template in new editor") : t("Confirm import and save draft")}</button><button type="button" className="button button-light" onClick={() => setIncoming(null)}>{t("Cancel")}</button></div>
    </div>}
  </section>;
}
