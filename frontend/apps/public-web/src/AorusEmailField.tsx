import { useId } from "react";
import { Field } from "@gigabyte-cashback/ui";
import { useLocale } from "./i18n";
import { emailVerificationMessage, type EmailVerificationState } from "./useAorusEmailVerification";

export function AorusEmailField({ value, onChange, state, onCheck, disabled }: {
  value: string;
  onChange: (value: string) => void;
  state: EmailVerificationState;
  onCheck: (force?: boolean) => void;
  disabled: boolean;
}) {
  const { t } = useLocale();
  const statusId = useId();
  const invalid = state.status === "not-found" || state.status === "invalid";
  return <div className="aorus-email-field">
    <Field label={t("AORUS email")} type="email" autoComplete="email" maxLength={254} required
      value={value} disabled={disabled} aria-describedby={statusId} aria-invalid={invalid || undefined}
      onChange={event => onChange(event.target.value)} onBlur={() => onCheck()} />
    <p id={statusId} className={`aorus-email-result aorus-email-${state.status}`} role="status" aria-live="polite" aria-atomic="true">
      {state.status === "verified" && <span aria-hidden="true">✓ </span>}
      {t(emailVerificationMessage(state.status))}
    </p>
    {["not-found", "unavailable"].includes(state.status) && <button type="button" className="button button-light aorus-email-retry"
      disabled={disabled} onClick={() => onCheck(true)}>{t("Check membership again")}</button>}
  </div>;
}
