import { useLocale } from "./i18n";
import { useState } from "react";

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
  markets,
  type Campaign,
  type CampaignInput,
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
          <div className="tabs">
            {["Details", "Products", "Retailers", "Content", "Versions"].map(
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
                <Field
                  label={t("Countries (comma-separated ISO codes)")}
                  value={draft.markets.join(",")}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      markets: e.target.value
                        .toUpperCase()
                        .split(",")
                        .map((x) => x.trim()),
                      market: e.target.value.split(",")[0].trim().toUpperCase(),
                    })
                  }
                />
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
                    value={draft[key].slice(0, 16)}
                    required
                    onChange={(e) =>
                      setDraft({ ...draft, [key]: e.target.value + ":00Z" })
                    }
                  />
                ))}
                {field("waitingDays", "Waiting days", "number")}
                {field("maxClaimsPerPerson", "Claims per person", "number")}
                {field("maxItemsPerCategory", "Items per category", "number")}
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
                  "maxClaimsPerHousehold",
                  "exclusivityGroup",
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
            {tab === "Products" && (
              <>
                <p className="muted">
                  {" "}
                  {t(
                    "Eligible products and rewards are captured in each published version.",
                  )}{" "}
                </p>
                {draft.products.map((p, i) => (
                  <div className="line-item" key={i}>
                    <div className="form-grid">
                      {(
                        ["id", "series", "category", "model", "ean"] as const
                      ).map((key) => (
                        <Field
                          key={key}
                          label={t(
                            key === "id"
                              ? "Product ID / SKU"
                              : (extraLabels[key] ?? key),
                          )}
                          required={
                            key === "id" ||
                            key === "model" ||
                            key === "category"
                          }
                          value={p[key]}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              products: draft.products.map((v, n) =>
                                n === i ? { ...v, [key]: e.target.value } : v,
                              ),
                            })
                          }
                        />
                      ))}
                      <Field
                        label={t("Cashback ({currency})", {
                          currency: draft.currency,
                        })}
                        type="number"
                        min="0"
                        step="0.01"
                        value={p.cashbackMinor / 100}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            products: draft.products.map((v, n) =>
                              n === i
                                ? {
                                    ...v,
                                    cashbackMinor: Math.round(
                                      Number(e.target.value) * 100,
                                    ),
                                  }
                                : v,
                            ),
                          })
                        }
                      />
                      <Field
                        label={t("Quantity limit")}
                        type="number"
                        min="1"
                        value={p.quantityLimit}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            products: draft.products.map((v, n) =>
                              n === i
                                ? {
                                    ...v,
                                    quantityLimit: Number(e.target.value),
                                  }
                                : v,
                            ),
                          })
                        }
                      />
                    </div>
                    <button
                      type="button"
                      className="button button-danger"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          products: draft.products.filter((_, n) => n !== i),
                        })
                      }
                    >
                      {" "}
                      {t("Remove product")}{" "}
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="button button-light"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      products: [
                        ...draft.products,
                        {
                          id: "",
                          series: "",
                          category: "Motherboard",
                          model: "",
                          ean: "",
                          cashbackMinor: 0,
                          quantityLimit: 1,
                        },
                      ],
                    })
                  }
                >
                  {" "}
                  {t("Add product")}{" "}
                </button>
              </>
            )}
            {tab === "Retailers" && (
              <>
                {draft.retailers.map((p, i) => (
                  <div className="line-item" key={i}>
                    <div className="form-grid">
                      {(["id", "name", "country", "url"] as const).map(
                        (key) => (
                          <Field
                            key={key}
                            label={t(extraLabels[key] ?? key)}
                            value={p[key]}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                retailers: draft.retailers.map((v, n) =>
                                  n === i ? { ...v, [key]: e.target.value } : v,
                                ),
                              })
                            }
                          />
                        ),
                      )}
                      {(["validFrom", "validTo"] as const).map((key) => (
                        <Field
                          key={key}
                          label={t(
                            key === "validFrom"
                              ? "Valid from (UTC)"
                              : "Valid until (UTC)",
                          )}
                          type="date"
                          value={p[key]?.slice(0, 10) ?? ""}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              retailers: draft.retailers.map((v, n) =>
                                n === i
                                  ? {
                                      ...v,
                                      [key]: e.target.value
                                        ? e.target.value + "T00:00:00Z"
                                        : null,
                                    }
                                  : v,
                              ),
                            })
                          }
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      className="button button-danger"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          retailers: draft.retailers.filter((_, n) => n !== i),
                        })
                      }
                    >
                      {" "}
                      {t("Remove retailer")}{" "}
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="button button-light"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      retailers: [
                        ...draft.retailers,
                        {
                          id: "",
                          name: "",
                          country: markets[0],
                          url: "",
                          validFrom: null,
                          validTo: null,
                        },
                      ],
                    })
                  }
                >
                  {" "}
                  {t("Add retailer")}{" "}
                </button>
              </>
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
            <div className="actions" style={{ marginTop: 24 }}>
              <button disabled={busy} className="button button-primary">
                {" "}
                {t("Save draft")}{" "}
              </button>
            </div>
          </form>
          {editing !== "new" && (
            <ActionForm
              reasonLabel={t("Reason / reference")}
              label={t("Publish saved version")}
              disabled={busy}
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
