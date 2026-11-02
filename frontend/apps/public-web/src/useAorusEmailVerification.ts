import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@gigabyte-cashback/api-client";

type Status = "idle" | "invalid" | "checking" | "verified" | "not-found" | "unavailable" | "skipped";
export type EmailVerificationState = { key: string; status: Status };
const messages: Record<Status, string> = {
  idle: "Your email will be checked for AORUS membership automatically.",
  invalid: "Enter a valid email address.",
  checking: "Checking AORUS membership…",
  verified: "AORUS member found for this email.",
  "not-found": "No AORUS member was found for this email. Please register an AORUS account or check your email.",
  unavailable: "AORUS membership verification is temporarily unavailable. Please try again later.",
  skipped: "Member verification is unavailable in this environment.",
};
export const emailVerificationMessage = (status: Status) => messages[status];

export function useAorusEmailVerification(claimId: string, value: string) {
  const email = value.trim();
  const key = `${claimId}:${email.toLowerCase()}`;
  const [result, setResult] = useState<EmailVerificationState>({ key: "", status: "idle" });
  const completed = useRef<EmailVerificationState | null>(null);
  const pending = useRef<{ key: string; controller: AbortController; promise: Promise<EmailVerificationState> } | null>(null);
  const verify = useCallback((force = false): Promise<EmailVerificationState> => {
    if (!email || email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+$/.test(email)) {
      const invalid: EmailVerificationState = { key, status: email ? "invalid" : "idle" };
      setResult(invalid);
      return Promise.resolve(invalid);
    }
    if (pending.current?.key === key && !pending.current.controller.signal.aborted) return pending.current.promise;
    if (!force && completed.current?.key === key && ["verified", "not-found", "skipped"].includes(completed.current.status)) {
      setResult(completed.current);
      return Promise.resolve(completed.current);
    }
    pending.current?.controller.abort();
    const controller = new AbortController();
    const entry = { key, controller, promise: Promise.resolve<EmailVerificationState>({ key, status: "checking" }) };
    pending.current = entry;
    setResult({ key, status: "checking" });
    entry.promise = (async () => {
      let state: EmailVerificationState;
      try {
        const reply = await api.verifyClaimEmail(claimId, email, controller.signal);
        if (reply.email.toLowerCase() !== email.toLowerCase() || ![true, false, null].includes(reply.isMember))
          throw new Error("Unexpected verification response");
        state = { key, status: reply.isMember === null ? "skipped" : reply.isMember ? "verified" : "not-found" };
      } catch {
        state = { key, status: controller.signal.aborted ? "idle" : "unavailable" };
      }
      // Replaced or cancelled requests must never publish an old email's result.
      if (pending.current === entry && !controller.signal.aborted) {
        completed.current = state;
        pending.current = null;
        setResult(state);
      }
      return state;
    })();
    return entry.promise;
  }, [claimId, email, key]);

  useEffect(() => {
    const timer = email && /^[^\s@<>]+@[^\s@<>]+$/.test(email)
      ? setTimeout(() => void verify(), 600)
      : undefined;
    return () => {
      clearTimeout(timer);
      if (pending.current?.key === key) pending.current.controller.abort();
    };
  }, [email, key, verify]);

  // Hide the old result immediately, before the new input's effect runs.
  return { state: result.key === key ? result : { key, status: "idle" as const }, verify };
}
