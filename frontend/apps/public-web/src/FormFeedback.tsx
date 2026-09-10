import { useCallback, useEffect, useRef, useState } from "react";
import "./form-feedback.css";

export type FeedbackLocale = "en" | "zh-TW";

export type FormFeedbackIssue = {
  id: number;
  message: string;
};

/** A new issue is produced on every attempt, even when the message is unchanged. */
export function useFormFeedback() {
  const [error, setError] = useState<FormFeedbackIssue | null>(null);
  const sequence = useRef(0);
  const reportError = useCallback((value: unknown) => {
    const message =
      value instanceof Error ? value.message : String(value ?? "");
    setError({ id: ++sequence.current, message });
  }, []);
  const clearError = useCallback(() => setError(null), []);
  return { error, reportError, clearError };
}

/** Render beside the form's submit actions so recovery stays in context. */
export function ErrorNotice({
  error,
  locale = "en",
  id,
}: {
  error: FormFeedbackIssue | null | undefined;
  locale?: FeedbackLocale;
  id?: string;
}) {
  const notice = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!error || !notice.current) return;
    notice.current.focus({ preventScroll: true });
    notice.current.scrollIntoView({ block: "nearest", behavior: "auto" });
  }, [error]);

  if (!error) return null;
  const chinese = locale === "zh-TW";
  return (
    <div
      ref={notice}
      id={id}
      className="form-error-notice"
      role="alert"
      aria-atomic="true"
      tabIndex={-1}
    >
      <span className="form-error-notice-icon" aria-hidden="true">
        !
      </span>
      <div>
        <strong>
          {chinese ? "無法完成操作" : "We couldn't complete this action"}
        </strong>
        <p>
          {error.message || (chinese ? "請再試一次。" : "Please try again.")}
        </p>
      </div>
    </div>
  );
}
