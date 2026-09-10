import { apiRequest, type Campaign, type CampaignInput, type Product, type Retailer } from "./operations";

export type CampaignConfiguration = { format: "gigabyte-cashback-campaign"; schemaVersion: 1; data: CampaignInput };
export type ConfigurationIssue = { path: string; message: string };
export type ConfigurationValidation = { errors: ConfigurationIssue[]; warnings: ConfigurationIssue[] };
export type ProductCatalogItem = Omit<Product, "cashbackMinor" | "quantityLimit"> & { group: string };
export type RetailerCatalogItem = Omit<Retailer, "validFrom" | "validTo"> & { group: string };
export type CampaignCatalog = { products: ProductCatalogItem[]; retailers: RetailerCatalogItem[] };
const post = <T>(path: string, body: unknown) => apiRequest<T>(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
export const configurationApi = {
  validate: (data: CampaignInput) => post<ConfigurationValidation>("/api/operations/campaigns/validate", data),
  export: (id: string, version?: number) => apiRequest<CampaignConfiguration>(`/api/operations/campaigns/${id}/configuration${version ? `?version=${version}` : ""}`),
  import: (configuration: CampaignConfiguration, reason: string, targetCampaignId?: string, concurrencyStamp?: string) => post<Campaign>("/api/operations/campaigns/import", { configuration, reason, targetCampaignId, concurrencyStamp }),
  catalog: () => apiRequest<CampaignCatalog>("/api/operations/catalog"),
  saveCatalog: (data: CampaignCatalog, reason: string, conflictStrategy: "reject" | "replace" = "reject") => post<CampaignCatalog>("/api/operations/catalog", { ...data, reason, conflictStrategy }),
};
