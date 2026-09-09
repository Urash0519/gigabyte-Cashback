export type FoundationCheck = {
  id: string;
  checkKey: string;
  status: string;
  detail: string;
  checkedAt: string;
};

export type NotificationOutbox = {
  id: string;
  channel: string;
  recipientMasked: string;
  subject: string;
  status: string;
  attempts: number;
};

export type StoredFile = {
  id: string;
  originalName: string;
  contentType: string;
  size: number;
  sha256: string;
  createdAt: string;
};

export type FoundationOverview = {
  service: string;
  environment: string;
  abpVersion: string;
  database: string;
  databaseStatus: string;
  blobProvider: string;
  auditLoggingEnabled: boolean;
  auditLogCount: number;
  verificationActionsEnabled: boolean;
  serverTimeUtc: string;
  permissions: string[];
  checks: FoundationCheck[];
  notifications: NotificationOutbox[];
  files: StoredFile[];
};

const apiBase = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export const applicationUrls = {
  publicWeb: import.meta.env.VITE_PUBLIC_WEB_URL ?? "http://localhost:5173",
  adminWeb: import.meta.env.VITE_ADMIN_WEB_URL ?? "http://localhost:5174",
  swagger: `${apiBase || "http://localhost:44305"}/swagger`,
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiBase + path, init);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export const foundationApi = {
  overview: () => request<FoundationOverview>("/api/foundation/overview"),
  verify: () =>
    request<FoundationOverview>("/api/foundation/verify", { method: "POST" }),
  upload: (file: File) => {
    const body = new FormData();
    body.append("file", file);
    return request<StoredFile>("/api/foundation/files", {
      method: "POST",
      body,
    });
  },
  downloadUrl: (id: string) => `${apiBase}/api/foundation/files/${id}`,
};

export * from "./operations";
export * from "./finance";
