import { apiRequest, type Action, type Payment } from "./operations";
export type Reconciliation = {
  id: string;
  paymentId: string;
  reference: string;
  amountMinor: number;
  currency: string;
  result: string;
  reason: string;
  matchStatus: string;
  createdAt: string;
};
export type PaymentAttempt = {
  id: string;
  paymentId: string;
  number: number;
  status: string;
  reference: string;
  reason: string;
  createdAt: string;
};
const base = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
export const financeApi = {
  batchExport: (id: string) =>
    `${base}/api/operations/payments/batches/${id}/export`,
  submitBatch: (id: string, data: Action) =>
    apiRequest<Payment[]>(`/api/operations/payments/batches/${id}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  attempts: (id: string) =>
    apiRequest<PaymentAttempt[]>(`/api/operations/payments/${id}/attempts`),
  reconciliations: () =>
    apiRequest<Reconciliation[]>("/api/operations/reconciliations"),
  reconcile: (data: Omit<Reconciliation, "id" | "matchStatus" | "createdAt">) =>
    apiRequest<Reconciliation>("/api/operations/reconciliations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
};
