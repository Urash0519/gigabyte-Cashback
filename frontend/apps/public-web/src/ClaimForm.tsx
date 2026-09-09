import { useState } from "react";
import {
  api,
  markets,
  type Campaign,
  type Claim,
  type ClaimInput,
} from "@gigabyte-cashback/api-client";
import { Field, SelectField, Panel, money, Badge } from "@gigabyte-cashback/ui";
type Props = {
  claim: Claim;
  campaign: Campaign;
  onSaved: (claim: Claim) => void;
  onBack: () => void;
};
export function ClaimForm({ claim, campaign, onSaved, onBack }: Props) {
  const [draft, setDraft] = useState<ClaimInput>(structuredClone(claim.data));
  const [current, setCurrent] = useState(claim);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const data =
    campaign.versions.find((v) => v.id === claim.campaignVersionId)?.data ??
    campaign.data;
  const text = (
    key: keyof ClaimInput,
    label: string,
    type = "text",
    required = false,
  ) => (
    <Field
      key={key}
      label={label}
      type={type}
      required={required}
      value={String(draft[key])}
      onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
    />
  );
  const execute = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
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
  return (
    <>
      <div className="page-head">
        <div>
          <h1>{data.name}</h1>
          <p>
            Claim {current.reference} · <Badge>{current.reviewStatus}</Badge>
          </p>
        </div>
        <button className="button button-light" onClick={onBack}>
          Back to my claims
        </button>
      </div>
      <div className="progress">
        {[
          "Applicant",
          "Bank details",
          "Purchase & products",
          "Evidence",
          "Review",
        ].map((label, i) => (
          <button
            key={label}
            className={step === i ? "active" : ""}
            disabled={busy}
            onClick={() => setStep(i)}
          >
            {i + 1}. {label}
          </button>
        ))}
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
      <Panel
        title={
          [
            "Applicant details",
            "Payment profile",
            "Purchase and products",
            "Supporting documents",
            "Review and submit",
          ][step]
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void execute(async () => {
              await save();
              if (step < 4) setStep(step + 1);
              else {
                const submitted = await api.submitClaim(current.id);
                onSaved(submitted);
                onBack();
              }
            });
          }}
        >
          {current.reviewStatus === "MoreInfoRequired" && (
            <Field
              label="Reason for correction"
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
                label="Title"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              >
                <option value="">Select title</option>
                {["Mr", "Ms", "Mrs", "Mx", "Dr"].map((x) => (
                  <option key={x}>{x}</option>
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
                label="Country of residence"
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
                label="Language"
                value={draft.language}
                onChange={(e) =>
                  setDraft({ ...draft, language: e.target.value })
                }
              >
                {[...new Set(["en", ...data.languages])].map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </SelectField>
            </div>
          )}
          {step === 1 && (
            <>
              <p className="message info">
                Use synthetic bank details for this evaluation. No money is
                transferred by this form.
              </p>
              <div className="form-grid">
                <Field
                  label="Bank country (ISO code)"
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
                  label="Account holder's profile type"
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
                    <option key={s}>{s}</option>
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
                    label={label}
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
                Saved account numbers are masked when retrieved. Leave a masked
                value unchanged to keep the stored account.
              </p>
            </>
          )}
          {step === 2 && (
            <>
              <div className="form-grid">
                <Field
                  label="Date of purchase"
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
                  label={`Total invoice amount (${data.currency})`}
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
                  label="Country of purchase"
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
                  label="Store name / eligible retailer"
                  value={draft.retailerId}
                  required
                  onChange={(e) =>
                    setDraft({ ...draft, retailerId: e.target.value })
                  }
                >
                  <option value="">Select retailer</option>
                  {data.retailers.map((r) => (
                    <option value={r.id} key={r.id}>
                      {r.name} ({r.country})
                    </option>
                  ))}
                </SelectField>
              </div>
              <hr className="section-divider" />
              <h3>Products on the same invoice</h3>
              {draft.items.map((item, i) => {
                const product = data.products.find(
                  (p) => p.id === item.productId,
                );
                return (
                  <div className="line-item" key={i}>
                    <div className="form-grid">
                      <SelectField
                        label="Series"
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
                        <option value="">Select series</option>
                        {[...new Set(data.products.map((p) => p.series))].map(
                          (s) => (
                            <option key={s}>{s}</option>
                          ),
                        )}
                      </SelectField>
                      <SelectField
                        label="Eligible product"
                        required
                        value={item.productId}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            items: draft.items.map((v, n) =>
                              n === i ? { ...v, productId: e.target.value } : v,
                            ),
                          })
                        }
                      >
                        <option value="">Select product</option>
                        {data.products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.series} · {p.model} ·{" "}
                            {money(p.cashbackMinor, data.currency)}
                          </option>
                        ))}
                      </SelectField>
                      <Field
                        label="Serial number"
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
                        label="Check number (if present)"
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
                        label="Product purchase date"
                        type="date"
                        value={(item.purchaseDate ?? draft.purchaseDate).slice(
                          0,
                          10,
                        )}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            items: draft.items.map((v, n) =>
                              n === i
                                ? {
                                    ...v,
                                    purchaseDate: e.target.value + "T00:00:00Z",
                                  }
                                : v,
                            ),
                          })
                        }
                      />
                      <SelectField
                        label="Product store name"
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
                        <option value="">Use invoice retailer</option>
                        {data.retailers.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name} ({r.country})
                          </option>
                        ))}
                      </SelectField>
                      <div>
                        <small>Category</small>
                        <p>{product?.category ?? "Select a product"}</p>
                        <small>
                          Purchase details default to the shared invoice.
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
                      Remove product
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
                Add product
              </button>
            </>
          )}
          {step === 3 && (
            <>
              <p>
                Upload JPG, PNG, PDF or TIFF evidence, up to 8 MB per file.
                Files are reviewed before approval.
              </p>
              <label className="field">
                <span>Proof of purchase (shared invoice)</span>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf,.tif,.tiff"
                  disabled={busy}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void execute(() => upload(file, "Invoice"));
                    e.target.value = "";
                  }}
                />
              </label>
              {draft.items.map((item, i) => (
                <label className="field line-item" key={i}>
                  <span>
                    Serial number image —{" "}
                    {data.products.find((p) => p.id === item.productId)
                      ?.model ?? item.productId}
                  </span>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf,.tif,.tiff"
                    disabled={busy || !item.productId}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file)
                        void execute(() =>
                          upload(file, "SerialNumber", item.productId),
                        );
                      e.target.value = "";
                    }}
                  />
                </label>
              ))}
              {draft.attachments.map((a) => (
                <div className="line-item" key={a.id}>
                  <a
                    href={api.downloadEvidence(current.id, a.id)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {a.fileName}
                  </a>{" "}
                  · {a.kind} · {a.scanStatus}
                </div>
              ))}
            </>
          )}
          {step === 4 && (
            <>
              <dl className="details">
                <div>
                  <dt>Applicant</dt>
                  <dd>
                    {draft.firstName} {draft.lastName}
                    <br />
                    {draft.email}
                  </dd>
                </div>
                <div>
                  <dt>Purchase</dt>
                  <dd>
                    {draft.invoiceNumber} · {draft.purchaseDate.slice(0, 10)}
                  </dd>
                </div>
                <div>
                  <dt>Bank country / account</dt>
                  <dd>
                    {draft.bankCountry} · ****
                    {(draft.bank.iban || draft.bank.accountNumber).slice(-4)}
                  </dd>
                </div>
                <div>
                  <dt>Estimated reward</dt>
                  <dd>
                    {money(total, data.currency)} / {draft.items.length}{" "}
                    products
                  </dd>
                </div>
              </dl>
              <details>
                <summary>Terms — version {data.termsVersion}</summary>
                <p className="pre-wrap">{data.terms}</p>
              </details>
              <details>
                <summary>Privacy notice</summary>
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
                />
                I accept the promotion terms.
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  required
                  checked={draft.privacyAccepted}
                  onChange={(e) =>
                    setDraft({ ...draft, privacyAccepted: e.target.checked })
                  }
                />
                I acknowledge the privacy notice.
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={draft.marketingAccepted}
                  onChange={(e) =>
                    setDraft({ ...draft, marketingAccepted: e.target.checked })
                  }
                />
                I would like to receive marketing updates (optional).
              </label>
              <p className="muted">
                Eligibility and the reward are recalculated on the server when
                you submit.
              </p>
            </>
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
              Save draft
            </button>
            {step > 0 && (
              <button
                type="button"
                disabled={busy}
                className="button button-light"
                onClick={() => setStep(step - 1)}
              >
                Previous
              </button>
            )}
            <button disabled={busy} className="button button-primary">
              {busy
                ? "Saving…"
                : step === 4
                  ? "Submit claim"
                  : "Save and continue"}
            </button>
          </div>
        </form>
      </Panel>
    </>
  );
}
