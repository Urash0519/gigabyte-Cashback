import { useEffect, useMemo, useRef, useState } from "react";
import {
  api,
  markets,
  type Campaign,
  type Claim,
  type ClaimInput,
  type ClaimVersionCheck,
} from "@gigabyte-cashback/api-client";
import { Field, SelectField, Panel, money, Badge } from "@gigabyte-cashback/ui";
import "./claim-form.css";
import { ErrorNotice, useFormFeedback } from "./FormFeedback";
import { VersionUpdateDialog } from "./VersionUpdateDialog";
import { useLocale } from "./i18n";
const steps = [
  {
    label: "Applicant",
    title: "Applicant details",
    hint: "Tell us who is claiming and where you live.",
  },
  {
    label: "Bank details",
    title: "Payment profile",
    hint: "Add the account where your approved cashback should go.",
  },
  {
    label: "Purchase & products",
    title: "Purchase and products",
    hint: "Add eligible products from the same invoice.",
  },
  {
    label: "Evidence",
    title: "Supporting documents",
    hint: "Upload your invoice and a serial number image for each product.",
  },
  {
    label: "Review",
    title: "Review and submit",
    hint: "Check every detail before sending your claim for review.",
  },
];
type Props = {
  claim: Claim;
  campaign: Campaign;
  onSaved: (claim: Claim) => void;
  onBack: () => void;
};
export function ClaimForm({ claim, campaign, onSaved, onBack }: Props) {
  const { locale, t } = useLocale();
  const [draft, setDraft] = useState<ClaimInput>(structuredClone(claim.data));
  const [current, setCurrent] = useState(claim);
  const [activeCampaign, setActiveCampaign] = useState(campaign);
  const [pendingVersion, setPendingVersion] = useState<ClaimVersionCheck>();
  const [checkingVersion, setCheckingVersion] = useState(
    claim.reviewStatus === "Draft",
  );
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const { error, reportError, clearError } = useFormFeedback();
  const localizedError = useMemo(
    () => (error ? { ...error, message: t(error.message) } : null),
    [error, t],
  );
  const [message, setMessage] = useState("");
  const [completed, setCompleted] = useState<number[]>([]);
  const [submittedClaim, setSubmittedClaim] = useState<Claim>();
  const successHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (submittedClaim) {
      window.scrollTo({ top: 0, behavior: "instant" });
      successHeading.current?.focus({ preventScroll: true });
    }
  }, [submittedClaim]);
  const data =
    activeCampaign.versions.find((v) => v.id === current.campaignVersionId)
      ?.data ?? activeCampaign.data;
  useEffect(() => {
    let cancelled = false;
    if (claim.reviewStatus !== "Draft") return;
    api
      .claimVersionCheck(claim.id)
      .then((check) => {
        if (!cancelled) {
          if (check.needsUpdate) setPendingVersion(check);
          else setActiveCampaign(check.campaign);
        }
      })
      .catch((e) => {
        if (!cancelled) reportError(e);
      })
      .finally(() => {
        if (!cancelled) setCheckingVersion(false);
      });
    return () => {
      cancelled = true;
    };
  }, [claim.id]);
  const text = (
    key: keyof ClaimInput,
    label: string,
    type = "text",
    required = false,
  ) => (
    <Field
      key={key}
      label={t(label)}
      type={type}
      required={required}
      value={String(draft[key])}
      onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
    />
  );
  const execute = async (fn: () => Promise<void>) => {
    setBusy(true);
    clearError();
    setMessage("");
    try {
      await fn();
    } catch (e) {
      reportError(e);
    } finally {
      setBusy(false);
    }
  };
  const save = async () => {
    const saved = await api.saveClaim(current.id, draft);
    setCurrent(saved);
    setDraft({
      ...saved.data,
      bank: {
        ...draft.bank,
        ...Object.fromEntries(
          Object.entries(saved.data.bank).filter(
            ([, v]) => v && !String(v).includes("*"),
          ),
        ),
      },
    });
    onSaved(saved);
    return saved;
  };
  const checkLatest = async () => {
    if (current.reviewStatus !== "Draft") return true;
    const check = await api.claimVersionCheck(current.id);
    if (check.needsUpdate) {
      setPendingVersion(check);
      return false;
    }
    return true;
  };
  const applyLatest = () =>
    void execute(async () => {
      if (!pendingVersion) return;
      // Save typed values before rebasing. The server preserves evidence and encrypted bank data.
      await save();
      try {
        const updated = await api.applyClaimVersion(
          current.id,
          pendingVersion.latestVersionId,
        );
        setCurrent(updated);
        setDraft(updated.data);
        setActiveCampaign(pendingVersion.campaign);
        onSaved(updated);
        setPendingVersion(undefined);
        setCompleted([]);
        setStep(4);
        setMessage(
          "Latest campaign rules applied. Review your details and confirm the terms again before submitting.",
        );
      } catch (e) {
        const refreshed = await api.claimVersionCheck(current.id);
        if (refreshed.needsUpdate) setPendingVersion(refreshed);
        throw e;
      }
    });
  const upload = async (file: File, kind: string, productId = "") => {
    await save();
    await api.upload(current.id, file, kind, productId);
    const saved = (await api.claims()).find((c) => c.id === current.id);
    if (saved) {
      setCurrent(saved);
      setDraft({ ...draft, attachments: saved.data.attachments });
      onSaved(saved);
    }
    setMessage("Evidence uploaded.");
  };
  const total = draft.items.reduce(
    (sum, i) =>
      sum +
      (data.products.find((p) => p.id === i.productId)?.cashbackMinor ?? 0),
    0,
  );
  const selectedCount = draft.items.filter((item) =>
    data.products.some((product) => product.id === item.productId),
  ).length;
  const edit = (target: number) => (
    <button
      type="button"
      className="button button-light"
      onClick={() => setStep(target)}
      disabled={busy}
    >
      {" "}
      {t("Edit")}{" "}
    </button>
  );
  const evidenceFiles = (kind: string, productId = "") =>
    draft.attachments.filter(
      (a) => a.kind === kind && (!productId || a.productId === productId),
    );
  const uploadCard = (
    label: string,
    kind: string,
    productId = "",
    disabled = false,
  ) => {
    const files = evidenceFiles(kind, productId);
    return (
      <div className={`claim-upload-card ${files.length ? "has-files" : ""}`}>
        <span className="claim-upload-symbol" aria-hidden="true">
          {files.length ? "✓" : "↑"}
        </span>
        <label className="field">
          <span>{t(label)}</span>
          <small>
            {files.length
              ? t("{count} file(s) uploaded", { count: files.length })
              : t("Choose a clear, readable image or document")}
          </small>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.pdf,.tif,.tiff"
            disabled={busy || disabled}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void execute(() => upload(file, kind, productId));
              e.target.value = "";
            }}
          />
        </label>
        {files.map((file) => (
          <div className="claim-upload-file" key={file.id}>
            <a
              href={api.downloadEvidence(current.id, file.id)}
              target="_blank"
              rel="noreferrer"
            >
              {file.fileName}
            </a>
            <small>
              {Math.ceil(file.size / 1024)} {t("KB ·")} {t(file.scanStatus)}
            </small>
          </div>
        ))}
      </div>
    );
  };
  if (submittedClaim)
    return (
      <section className="claim-success" aria-labelledby="claim-success-title">
        <div className="claim-success-mark" aria-hidden="true">
          ✓
        </div>
        <p className="claim-eyebrow">{t("Application received")}</p>
        <h1 id="claim-success-title" ref={successHeading} tabIndex={-1}>
          {" "}
          {t("Your claim is on its way.")}{" "}
        </h1>
        <p>
          {" "}
          {t("We have received your claim for")} {data.name}
          {t(
            ". Keep your reference handy while we review your application.",
          )}{" "}
        </p>
        <div className="claim-success-summary">
          <div>
            <small>{t("Claim reference")}</small>
            <strong>{submittedClaim.reference}</strong>
          </div>
          <div>
            <small>{t("Cashback submitted for review")}</small>
            <strong>
              {money(submittedClaim.amountMinor, submittedClaim.currency)}
            </strong>
          </div>
        </div>
        <div className="claim-next-steps">
          <h2>{t("What happens next?")}</h2>
          <ol>
            <li>
              {" "}
              {t(
                "We check your purchase, product details and supporting documents.",
              )}{" "}
            </li>
            <li>
              {" "}
              {t(
                "If we need more information, you can provide it through My claims.",
              )}{" "}
            </li>
            <li>
              {" "}
              {t(
                "Track your review status and, once approved, payment progress in My claims.",
              )}{" "}
            </li>
          </ol>
        </div>
        <button className="button button-primary" onClick={onBack}>
          {" "}
          {t("Track in My claims")}{" "}
        </button>
      </section>
    );
  return (
    <>
      <VersionUpdateDialog
        open={Boolean(pendingVersion)}
        currentVersion={pendingVersion?.currentVersion ?? 0}
        latestVersion={pendingVersion?.latestVersion ?? 0}
        onConfirm={applyLatest}
        onCancel={() => {
          setPendingVersion(undefined);
        }}
        busy={busy}
        error={localizedError}
        locale={locale}
      />
      <div className="page-head">
        <div>
          <h1>{data.name}</h1>
          <p>
            {" "}
            {t("Claim")} {current.reference} ·{" "}
            <Badge label={t(current.reviewStatus)}>
              {current.reviewStatus}
            </Badge>
          </p>
        </div>
        <button className="button button-light" onClick={onBack}>
          {" "}
          {t("Back to my claims")}{" "}
        </button>
      </div>
      <div className="claim-wizard">
        <aside className="claim-step-sidebar" aria-label={t("Claim progress")}>
          <p className="claim-eyebrow">{t("Your application")}</p>
          <div className="claim-step-list">
            {steps.map(({ label }, i) => (
              <button
                key={label}
                className={step === i ? "active" : ""}
                aria-current={step === i ? "step" : undefined}
                disabled={busy}
                onClick={() => setStep(i)}
              >
                <span
                  className={`claim-step-number ${completed.includes(i) ? "complete" : ""}`}
                >
                  {completed.includes(i) ? (
                    <>
                      <span aria-hidden="true">✓</span>
                      <span className="claim-sr-only">{t("Saved:")} </span>
                    </>
                  ) : (
                    i + 1
                  )}
                </span>
                <span>{t(label)}</span>
              </button>
            ))}
          </div>
          <p className="claim-sidebar-help">
            {" "}
            {t(
              "One invoice, multiple eligible products. Save your draft and return whenever you need.",
            )}{" "}
          </p>
        </aside>
        <div className="claim-step-content">
          {checkingVersion && (
            <p role="status">{t("Checking campaign updates…")}</p>
          )}
          {message && (
            <p className="message" role="status">
              {t(message)}
            </p>
          )}
          <Panel title={t(steps[step].title)}>
            <p className="claim-step-hint">
              {" "}
              {t("Step")} {step + 1} {t("of 5 ·")} {t(steps[step].hint)}
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void execute(async () => {
                  if (step === 4 && !(await checkLatest())) return;
                  await save();
                  setCompleted((previous) => [...new Set([...previous, step])]);
                  if (step < 4) setStep(step + 1);
                  else {
                    let submitted: Claim;
                    try {
                      submitted = await api.submitClaim(current.id);
                    } catch (e) {
                      if (
                        current.reviewStatus === "Draft" &&
                        !(await checkLatest())
                      )
                        return;
                      throw e;
                    }
                    onSaved(submitted);
                    setCurrent(submitted);
                    setSubmittedClaim(submitted);
                  }
                });
              }}
            >
              {current.reviewStatus === "MoreInfoRequired" && (
                <Field
                  label={t("Reason for correction")}
                  required
                  value={draft.changeReason ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, changeReason: e.target.value })
                  }
                />
              )}
              {step === 0 && (
                <div className="form-grid">
                  <SelectField
                    label={t("Title")}
                    value={draft.title}
                    onChange={(e) =>
                      setDraft({ ...draft, title: e.target.value })
                    }
                  >
                    <option value="">{t("Select title")}</option>
                    {["Mr", "Ms", "Mrs", "Mx", "Dr"].map((x) => (
                      <option key={x} value={x}>
                        {t(x)}
                      </option>
                    ))}
                  </SelectField>
                  {text("firstName", "First name", "text", true)}
                  {text("lastName", "Last name", "text", true)}
                  {text("email", "AORUS email", "email", true)}
                  {text("confirmEmail", "Confirm email", "email", true)}
                  {text("phone", "Mobile number", "tel", true)}
                  {text("address1", "Address", "text", true)}
                  {text("address2", "Address line 2")}
                  {text("city", "City", "text", true)}
                  {text("state", "State / region")}
                  {text("postcode", "Postal code", "text", true)}
                  <SelectField
                    label={t("Country of residence")}
                    value={draft.residenceCountry}
                    onChange={(e) =>
                      setDraft({ ...draft, residenceCountry: e.target.value })
                    }
                  >
                    {markets.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </SelectField>
                  <SelectField
                    label={t("Language")}
                    value={draft.language}
                    onChange={(e) =>
                      setDraft({ ...draft, language: e.target.value })
                    }
                  >
                    {[...new Set(["en", "zh-TW", ...data.languages])].map(
                      (l) => (
                        <option key={l} value={l}>
                          {l === "zh-TW"
                            ? "繁體中文"
                            : l === "en"
                              ? "English"
                              : l}
                        </option>
                      ),
                    )}
                  </SelectField>
                </div>
              )}
              {step === 1 && (
                <>
                  <p className="message info">
                    {" "}
                    {t(
                      "Use synthetic bank details for this evaluation. No money is transferred by this form.",
                    )}{" "}
                  </p>
                  <div className="form-grid">
                    <Field
                      label={t("Bank country (ISO code)")}
                      value={draft.bankCountry}
                      required
                      maxLength={2}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          bankCountry: e.target.value.toUpperCase(),
                        })
                      }
                    />
                    <SelectField
                      label={t("Account holder's profile type")}
                      value={draft.bank.accountHolderProfileType}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          bank: {
                            ...draft.bank,
                            accountHolderProfileType: e.target.value,
                          },
                        })
                      }
                    >
                      {["Individual", "Company"].map((s) => (
                        <option key={s} value={s}>
                          {t(s)}
                        </option>
                      ))}
                    </SelectField>
                    {(
                      [
                        ["accountHolder", "Account holder full name"],
                        ["bankName", "Bank name"],
                        ["iban", "IBAN"],
                        ["bic", "BIC / SWIFT"],
                        ["accountNumber", "Full bank account number"],
                        ["sortCode", "Sort code (where applicable)"],
                      ] as const
                    ).map(([key, label]) => (
                      <Field
                        key={key}
                        label={t(label)}
                        autoComplete="off"
                        value={draft.bank[key]}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            bank: { ...draft.bank, [key]: e.target.value },
                          })
                        }
                      />
                    ))}
                  </div>
                  <p className="muted">
                    {" "}
                    {t(
                      "Saved account numbers are masked when retrieved. Leave a masked value unchanged to keep the stored account.",
                    )}{" "}
                  </p>
                </>
              )}
              {step === 2 && (
                <>
                  <div className="form-grid">
                    <Field
                      label={t("Date of purchase")}
                      type="date"
                      required
                      value={draft.purchaseDate.slice(0, 10)}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          purchaseDate: e.target.value + "T00:00:00Z",
                        })
                      }
                    />
                    {text(
                      "invoiceNumber",
                      "Invoice / receipt number",
                      "text",
                      true,
                    )}
                    <Field
                      label={t("Total invoice amount ({currency})", {
                        currency: data.currency,
                      })}
                      type="number"
                      min="0"
                      step="0.01"
                      value={draft.purchaseAmountMinor / 100}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          purchaseAmountMinor: Math.round(
                            Number(e.target.value) * 100,
                          ),
                        })
                      }
                    />
                    <Field
                      label={t("Country of purchase")}
                      value={draft.purchaseCountry}
                      maxLength={2}
                      required
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          purchaseCountry: e.target.value.toUpperCase(),
                        })
                      }
                    />
                    <SelectField
                      label={t("Store name / eligible retailer")}
                      value={draft.retailerId}
                      required
                      onChange={(e) =>
                        setDraft({ ...draft, retailerId: e.target.value })
                      }
                    >
                      <option value="">{t("Select retailer")}</option>
                      {data.retailers.map((r) => (
                        <option value={r.id} key={r.id}>
                          {r.name} ({r.country})
                        </option>
                      ))}
                    </SelectField>
                  </div>
                  <hr className="section-divider" />
                  <h3>{t("Products on the same invoice")}</h3>
                  {draft.items.map((item, i) => {
                    const product = data.products.find(
                      (p) => p.id === item.productId,
                    );
                    return (
                      <div className="line-item" key={i}>
                        <div className="form-grid">
                          <SelectField
                            label={t("Series")}
                            value={product?.series ?? ""}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                items: draft.items.map((v, n) =>
                                  n === i
                                    ? {
                                        ...v,
                                        productId:
                                          data.products.find(
                                            (p) => p.series === e.target.value,
                                          )?.id ?? "",
                                      }
                                    : v,
                                ),
                              })
                            }
                          >
                            <option value="">{t("Select series")}</option>
                            {[
                              ...new Set(data.products.map((p) => p.series)),
                            ].map((s) => (
                              <option key={s}>{s}</option>
                            ))}
                          </SelectField>
                          <SelectField
                            label={t("Eligible product")}
                            required
                            value={item.productId}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                items: draft.items.map((v, n) =>
                                  n === i
                                    ? { ...v, productId: e.target.value }
                                    : v,
                                ),
                              })
                            }
                          >
                            <option value="">{t("Select product")}</option>
                            {data.products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.series} · {p.model} ·{" "}
                                {money(p.cashbackMinor, data.currency)}
                              </option>
                            ))}
                          </SelectField>
                          <Field
                            label={t("Serial number")}
                            required
                            value={item.serialNumber}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                items: draft.items.map((v, n) =>
                                  n === i
                                    ? { ...v, serialNumber: e.target.value }
                                    : v,
                                ),
                              })
                            }
                          />
                          <Field
                            label={t("Check number (if present)")}
                            value={item.checkNumber}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                items: draft.items.map((v, n) =>
                                  n === i
                                    ? { ...v, checkNumber: e.target.value }
                                    : v,
                                ),
                              })
                            }
                          />
                          <Field
                            label={t("Product purchase date")}
                            type="date"
                            value={(
                              item.purchaseDate ?? draft.purchaseDate
                            ).slice(0, 10)}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                items: draft.items.map((v, n) =>
                                  n === i
                                    ? {
                                        ...v,
                                        purchaseDate:
                                          e.target.value + "T00:00:00Z",
                                      }
                                    : v,
                                ),
                              })
                            }
                          />
                          <SelectField
                            label={t("Product store name")}
                            value={item.retailerId || draft.retailerId}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                items: draft.items.map((v, n) =>
                                  n === i
                                    ? { ...v, retailerId: e.target.value }
                                    : v,
                                ),
                              })
                            }
                          >
                            <option value="">
                              {t("Use invoice retailer")}
                            </option>
                            {data.retailers.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name} ({r.country})
                              </option>
                            ))}
                          </SelectField>
                          <div>
                            <small>{t("Category")}</small>
                            <p>{product?.category ?? t("Select a product")}</p>
                            <small>
                              {" "}
                              {t(
                                "Purchase details default to the shared invoice.",
                              )}{" "}
                            </small>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="button button-danger"
                          onClick={() =>
                            setDraft({
                              ...draft,
                              items: draft.items.filter((_, n) => n !== i),
                            })
                          }
                        >
                          {" "}
                          {t("Remove product")}{" "}
                        </button>
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    className="button button-light"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        items: [
                          ...draft.items,
                          {
                            productId: "",
                            serialNumber: "",
                            checkNumber: "",
                            amountMinor: 0,
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
              {step === 3 && (
                <>
                  <p>
                    {" "}
                    {t(
                      "Upload JPG, PNG, PDF or TIFF evidence, up to 8 MB per file. Files are reviewed before approval.",
                    )}{" "}
                  </p>
                  <div className="claim-upload-grid">
                    {uploadCard(
                      "Proof of purchase (shared invoice)",
                      "Invoice",
                    )}
                    {draft.items.map((item, i) => (
                      <div key={i}>
                        {uploadCard(
                          t("Serial number image — {product}", {
                            product:
                              data.products.find((p) => p.id === item.productId)
                                ?.model ?? t("Select a product first"),
                          }),
                          "SerialNumber",
                          item.productId,
                          !item.productId,
                        )}
                      </div>
                    ))}
                  </div>{" "}
                </>
              )}
              {step === 4 && (
                <>
                  <section className="claim-review-block">
                    <header>
                      <h3>{t("Applicant")}</h3>
                      {edit(0)}
                    </header>
                    <dl className="details">
                      <div>
                        <dt>{t("Name & email")}</dt>
                        <dd>
                          {draft.title} {draft.firstName} {draft.lastName}
                          <br />
                          {draft.email}
                        </dd>
                      </div>
                      <div>
                        <dt>{t("Contact")}</dt>
                        <dd>
                          {draft.phone}
                          <br />
                          {[
                            draft.address1,
                            draft.address2,
                            draft.city,
                            draft.state,
                            draft.postcode,
                            draft.residenceCountry,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </dd>
                      </div>
                      <div>
                        <dt>{t("Language")}</dt>
                        <dd>{draft.language}</dd>
                      </div>
                    </dl>
                  </section>
                  <section className="claim-review-block">
                    <header>
                      <h3>{t("Payment profile")}</h3>
                      {edit(1)}
                    </header>
                    <dl className="details">
                      <div>
                        <dt>{t("Account holder")}</dt>
                        <dd>
                          {draft.bank.accountHolder} ·{" "}
                          {t(draft.bank.accountHolderProfileType)}
                        </dd>
                      </div>
                      <div>
                        <dt>{t("Bank / country")}</dt>
                        <dd>
                          {draft.bank.bankName || "—"} · {draft.bankCountry}
                        </dd>
                      </div>
                      <div>
                        <dt>{t("Account")}</dt>
                        <dd>
                          {draft.bank.iban || draft.bank.accountNumber
                            ? `•••• ${(draft.bank.iban || draft.bank.accountNumber).slice(-4)}`
                            : t("Not provided")}
                        </dd>
                      </div>
                    </dl>
                  </section>
                  <section className="claim-review-block">
                    <header>
                      <h3>{t("Purchase & products")}</h3>
                      {edit(2)}
                    </header>
                    <dl className="details">
                      <div>
                        <dt>{t("Invoice")}</dt>
                        <dd>
                          {draft.invoiceNumber} ·{" "}
                          {draft.purchaseDate.slice(0, 10)}
                        </dd>
                      </div>
                      <div>
                        <dt>{t("Retailer / country")}</dt>
                        <dd>
                          {data.retailers.find((r) => r.id === draft.retailerId)
                            ?.name || t("Not selected")}{" "}
                          · {draft.purchaseCountry}
                        </dd>
                      </div>
                      <div>
                        <dt>{t("Invoice amount")}</dt>
                        <dd>
                          {money(draft.purchaseAmountMinor, data.currency)}
                        </dd>
                      </div>
                    </dl>
                    {draft.items.map((item, i) => {
                      const product = data.products.find(
                        (p) => p.id === item.productId,
                      );
                      return (
                        <div className="claim-review-product" key={i}>
                          <div>
                            <strong>
                              {product
                                ? `${product.series} · ${product.model}`
                                : t("No product selected")}
                            </strong>
                            <p>
                              {" "}
                              {t("Serial:")}{" "}
                              {item.serialNumber || t("Not provided")}
                              {item.checkNumber &&
                                ` · Check: ${item.checkNumber}`}
                            </p>
                            <small>
                              {(item.purchaseDate || draft.purchaseDate).slice(
                                0,
                                10,
                              )}{" "}
                              ·{" "}
                              {data.retailers.find(
                                (r) =>
                                  r.id ===
                                  (item.retailerId || draft.retailerId),
                              )?.name || t("Not selected")}
                            </small>
                          </div>
                          <strong>
                            {money(product?.cashbackMinor ?? 0, data.currency)}
                          </strong>
                        </div>
                      );
                    })}
                  </section>
                  <section className="claim-review-block">
                    <header>
                      <h3>{t("Supporting documents")}</h3>
                      {edit(3)}
                    </header>
                    {draft.attachments.length ? (
                      draft.attachments.map((a) => (
                        <div className="claim-review-evidence" key={a.id}>
                          <a
                            href={api.downloadEvidence(current.id, a.id)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {a.fileName}
                          </a>
                          <small>
                            {a.kind === "Invoice"
                              ? t("Shared invoice")
                              : `${t("Serial number")} · ${data.products.find((p) => p.id === a.productId)?.model ?? a.productId}`}{" "}
                            · {t(a.scanStatus)}
                          </small>
                        </div>
                      ))
                    ) : (
                      <p>{t("No evidence uploaded yet.")}</p>
                    )}
                  </section>{" "}
                  <details>
                    <summary>
                      {t("Terms — version")} {data.termsVersion}
                    </summary>
                    <p className="pre-wrap">{data.terms}</p>
                  </details>
                  <details>
                    <summary>{t("Privacy notice")}</summary>
                    <p className="pre-wrap">{data.privacy}</p>
                  </details>
                  <label className="check">
                    <input
                      type="checkbox"
                      required
                      checked={draft.termsAccepted}
                      onChange={(e) =>
                        setDraft({ ...draft, termsAccepted: e.target.checked })
                      }
                    />{" "}
                    {t("I accept the promotion terms.")}{" "}
                  </label>
                  <label className="check">
                    <input
                      type="checkbox"
                      required
                      checked={draft.privacyAccepted}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          privacyAccepted: e.target.checked,
                        })
                      }
                    />{" "}
                    {t("I acknowledge the privacy notice.")}{" "}
                  </label>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={draft.marketingAccepted}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          marketingAccepted: e.target.checked,
                        })
                      }
                    />{" "}
                    {t(
                      "I would like to receive marketing updates (optional).",
                    )}{" "}
                  </label>
                  <p className="muted">
                    {" "}
                    {t(
                      "Eligibility and the reward are recalculated on the server when you submit.",
                    )}{" "}
                  </p>
                </>
              )}
              <div className="claim-reward-summary" aria-live="polite">
                <div>
                  <small>{t("Estimated cashback")}</small>
                  <strong>{money(total, data.currency)}</strong>
                </div>
                <span>
                  {t("{count} eligible products selected", {
                    count: selectedCount,
                  })}
                  <br />
                  <small>{t("Subject to eligibility review")}</small>
                </span>
              </div>
              {!pendingVersion && (
                <ErrorNotice error={localizedError} locale={locale} />
              )}
              <div className="actions" style={{ marginTop: 24 }}>
                <button
                  type="button"
                  disabled={busy}
                  className="button button-light"
                  onClick={() =>
                    void execute(async () => {
                      await save();
                      setMessage("Draft saved.");
                    })
                  }
                >
                  {" "}
                  {t("Save draft")}{" "}
                </button>
                {step > 0 && (
                  <button
                    type="button"
                    disabled={busy}
                    className="button button-light"
                    onClick={() => setStep(step - 1)}
                  >
                    {" "}
                    {t("Previous")}{" "}
                  </button>
                )}
                <button
                  disabled={busy || checkingVersion || Boolean(pendingVersion)}
                  className="button button-primary"
                >
                  {busy
                    ? t("Saving…")
                    : step === 4
                      ? t("Submit claim")
                      : t("Save and continue")}
                </button>
              </div>
            </form>
          </Panel>
        </div>
      </div>
    </>
  );
}
