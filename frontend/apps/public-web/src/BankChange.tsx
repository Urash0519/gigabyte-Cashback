import { useState } from "react";
import {
  apiRequest,
  type Bank,
  type Claim,
} from "@gigabyte-cashback/api-client";
import { Field, SelectField, Panel, ActionForm } from "@gigabyte-cashback/ui";
export function BankChange({
  claim,
  onSaved,
}: {
  claim: Claim;
  onSaved: (c: Claim) => void;
}) {
  const [bank, setBank] = useState<Bank>({
    accountHolderProfileType: "Individual",
    accountHolder: "",
    bankName: "",
    iban: "",
    bic: "",
    accountNumber: "",
    sortCode: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <Panel title="Change payment profile">
      <p className="muted">
        Changes before authorization return the claim to review. Account details
        are never changed on an existing payment instruction.
      </p>
      <div className="form-grid">
        <SelectField
          label="Account holder profile"
          value={bank.accountHolderProfileType}
          onChange={(e) =>
            setBank({ ...bank, accountHolderProfileType: e.target.value })
          }
        >
          <option>Individual</option>
          <option>Company</option>
        </SelectField>
        {(
          [
            ["accountHolder", "Account holder"],
            ["bankName", "Bank name"],
            ["iban", "IBAN"],
            ["bic", "BIC / SWIFT"],
            ["accountNumber", "Account number"],
            ["sortCode", "Sort code"],
          ] as const
        ).map(([k, label]) => (
          <Field
            key={k}
            label={label}
            value={bank[k]}
            autoComplete="off"
            onChange={(e) => setBank({ ...bank, [k]: e.target.value })}
          />
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
      <ActionForm
        label="Submit bank change"
        disabled={busy}
        onSubmit={async (reason) => {
          setBusy(true);
          setError("");
          try {
            onSaved(
              await apiRequest<Claim>(
                `/api/operations/claims/${claim.id}/bank`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ bank, reason }),
                },
              ),
            );
            setMessage("Payment profile changed and review reset.");
            setBank({ ...bank, iban: "", accountNumber: "", sortCode: "" });
          } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
          } finally {
            setBusy(false);
          }
        }}
      />
    </Panel>
  );
}
