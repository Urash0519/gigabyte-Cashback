import { useEffect, useId, useRef } from "react";
import {
  ErrorNotice,
  type FeedbackLocale,
  type FormFeedbackIssue,
} from "./FormFeedback";
import "./version-update-dialog.css";

export type VersionUpdateDialogProps = {
  open: boolean;
  currentVersion: string | number;
  latestVersion: string | number;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
  error?: FormFeedbackIssue | null;
  locale?: FeedbackLocale;
};

export function VersionUpdateDialog({
  open,
  currentVersion,
  latestVersion,
  onConfirm,
  onCancel,
  busy = false,
  error,
  locale = "en",
}: VersionUpdateDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const chinese = locale === "zh-TW";

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      element.showModal();
      cancelButton.current?.focus();
    } else if (!open && element.open) {
      element.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialog}
      className="version-update-dialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-busy={busy}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
    >
      <div className="version-update-dialog-content">
        <p className="version-update-eyebrow">
          {chinese ? "活動版本更新" : "Promotion update"}
        </p>
        <h2 id={titleId}>
          {chinese ? "套用最新活動規則？" : "Use the latest promotion rules?"}
        </h2>
        <p id={descriptionId}>
          {chinese
            ? "此活動已發布新版本。您填寫的申請資料會保留；更新後，請重新確認產品資格、回饋金額與同意事項，再送出申請。"
            : "A new version of this promotion is available. Your entered claim details will be preserved. After updating, review product eligibility, cashback amounts and consent before submitting."}
        </p>
        <dl className="version-update-comparison">
          <div>
            <dt>{chinese ? "目前版本" : "Current version"}</dt>
            <dd>{currentVersion}</dd>
          </div>
          <div>
            <dt>{chinese ? "最新版本" : "Latest version"}</dt>
            <dd>{latestVersion}</dd>
          </div>
        </dl>
        <p className="version-update-consent-note">
          {chinese
            ? "更新後須重新勾選活動條款與隱私聲明的同意欄位。"
            : "After updating, you will need to check the promotion terms and privacy acknowledgement again."}
        </p>
        <ErrorNotice error={open ? error : null} locale={locale} />
        <div className="version-update-actions">
          <button
            ref={cancelButton}
            type="button"
            className="button button-light"
            disabled={busy}
            onClick={onCancel}
          >
            {chinese ? "暫不更新" : "Not now"}
          </button>
          <button
            type="button"
            className="button button-primary"
            disabled={busy}
            onClick={onConfirm}
          >
            {busy
              ? chinese
                ? "更新中…"
                : "Updating…"
              : chinese
                ? "保留資料並更新"
                : "Keep details and update"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
