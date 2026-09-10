import { useEffect, useRef, useState } from "react";
import { useLocale } from "./i18n";
import {
  api,
  markets,
  type Campaign,
  type Report,
  type ReportRow,
} from "@gigabyte-cashback/api-client";
import {
  Field,
  SelectField,
  Panel,
  Empty,
  money,
  date,
  downloadCsv,
} from "@gigabyte-cashback/ui";

type Filters = { campaignId: string; market: string; from: string; to: string };
const initialFilters: Filters = {
  campaignId: "",
  market: "",
  from: "",
  to: "",
};
const labels: Record<string, string> = {
  campaign: "Campaign",
  market: "Campaign market",
  purchaseCountry: "Purchase country",
  residenceCountry: "Residence country",
  bankCountry: "Bank country",
  language: "Language",
  reviewStatus: "Review status",
  paymentStatus: "Payment status",
  retailer: "Retailer",
  month: "Submission month",
  week: "Submission week",
  riskHold: "Risk hold",
  product: "Product",
  series: "Series",
  category: "Category",
};
const rate = (row: ReportRow) =>
  row.approved + row.rejected === 0 || row.approvalRate == null
    ? null
    : row.approvalRate * 100;

export function Reports({ campaigns }: { campaigns: Campaign[] }) {
  const { t } = useLocale();
  const [report, setReport] = useState<Report>();
  const [filters, setFilters] = useState(initialFilters);
  const [applied, setApplied] = useState(initialFilters);
  const [dimension, setDimension] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const requestId = useRef(0);

  const load = async (query: Filters) => {
    const currentRequest = ++requestId.current;
    setBusy(true);
    setError("");
    try {
      const result = await api.reports({
        ...query,
        from: query.from ? query.from + "T00:00:00Z" : "",
        to: query.to ? query.to + "T00:00:00Z" : "",
      });
      if (currentRequest !== requestId.current) return;
      setReport(result);
      setApplied(query);
    } catch (e) {
      if (currentRequest === requestId.current)
        setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (currentRequest === requestId.current) setBusy(false);
    }
  };
  useEffect(() => {
    void load(initialFilters);
    return () => {
      requestId.current++;
    };
  }, []);

  const dimensions = [...new Set(report?.rows.map((row) => row.dimension))];
  const rows =
    report?.rows.filter((row) => !dimension || row.dimension === dimension) ??
    [];
  const valueLabel = (row: ReportRow) => {
    if (row.dimension === "paymentStatus" && row.value === "None")
      return t("Not authorized");
    if (row.dimension === "campaign")
      return campaigns.find((c) => c.id === row.value)?.data.name ?? row.value;
    if (row.dimension === "product")
      return (
        campaigns
          .flatMap((c) => c.data.products)
          .find((p) => p.id === row.value)?.model ?? row.value
      );
    if (row.dimension === "retailer")
      return (
        campaigns
          .flatMap((c) => c.data.retailers)
          .find((r) => r.id === row.value)?.name ?? row.value
      );
    return t(row.value);
  };
  const csv = async () => {
    if (!report) return;
    setBusy(true);
    setError("");
    try {
      const content = await api.exportReport({
        ...applied,
        from: applied.from ? applied.from + "T00:00:00Z" : "",
        to: applied.to ? applied.to + "T00:00:00Z" : "",
        dimension,
      });
      downloadCsv("cashback-report.csv", content);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  const update = (key: keyof Filters, value: string) =>
    setFilters((previous) => ({ ...previous, [key]: value }));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{t("Reports")}</h1>
          <p>
            {t("Promotion performance, case operations and payment outcomes.")}
          </p>
        </div>
        <button
          className="button button-light"
          disabled={!report || busy || !rows.length}
          onClick={() => void csv()}
        >
          {t("Export latest matching data")}
        </button>
      </div>
      <Panel title={t("Report filters")}>
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            if (filters.from && filters.to && filters.to <= filters.from) {
              setError("Until must be after the start date.");
              return;
            }
            void load(filters);
          }}
        >
          <SelectField
            label={t("Campaign")}
            value={filters.campaignId}
            onChange={(event) => update("campaignId", event.target.value)}
          >
            <option value="">{t("All campaigns")}</option>
            {campaigns.map((c) => (
              <option value={c.id} key={c.id}>
                {c.data.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            label={t("Campaign market")}
            value={filters.market}
            onChange={(event) => update("market", event.target.value)}
          >
            <option value="">{t("All markets")}</option>
            {markets.map((m) => (
              <option key={m} value={m}>
                {t(m)}
              </option>
            ))}
          </SelectField>
          <Field
            label={t("Submitted from (inclusive, UTC)")}
            type="date"
            value={filters.from}
            onChange={(event) => update("from", event.target.value)}
          />
          <Field
            label={t("Submitted until (exclusive, UTC)")}
            type="date"
            value={filters.to}
            onChange={(event) => update("to", event.target.value)}
          />
          <div>
            <button className="button button-primary" disabled={busy}>
              {t(busy ? "Loading…" : "Apply filters")}
            </button>
          </div>
        </form>
      </Panel>
      {error && (
        <p className="message error" role="alert">
          {t(error)}
        </p>
      )}
      <Panel title={t("Grouped results")}>
        <div className="toolbar">
          <SelectField
            label={t("Dimension")}
            value={dimension}
            onChange={(event) => setDimension(event.target.value)}
          >
            <option value="">{t("All dimensions")}</option>
            {dimensions.map((d) => (
              <option key={d} value={d}>
                {t(labels[d] ?? d)}
              </option>
            ))}
          </SelectField>
        </div>
        <p className="muted">
          {t("Date basis")}: {t(report?.dateBasis ?? "SubmittedAt")} ·{" "}
          {t("Time zone")}: {report?.timeZone ?? "UTC"} · {t("Generated")}{" "}
          {date(report?.generatedAt)}
        </p>
        <p className="muted">
          {t("Applied scope")}:{" "}
          {campaigns.find((c) => c.id === applied.campaignId)?.data.name ??
            t("All campaigns")}{" "}
          · {t(applied.market || "All markets")} ·{" "}
          {applied.from || t("Beginning")} {t("inclusive")} →{" "}
          {applied.to || t("No end")} {t("exclusive")}.
        </p>
        <div className="table-wrap" aria-busy={busy}>
          <table>
            <thead>
              <tr>
                <th>{t("Dimension")}</th>
                <th>{t("Value")}</th>
                <th>{t("Currency")}</th>
                <th>{t("Claim count")}</th>
                <th>{t("Items")}</th>
                <th>{t("Claimed amount")}</th>
                <th>{t("Approved")}</th>
                <th>{t("Rejected")}</th>
                <th>{t("Approval rate")}</th>
                <th>{t("Paid claims")}</th>
                <th>{t("On hold")}</th>
                <th>{t("SLA overdue")}</th>
                <th>{t("First review overdue")}</th>
                <th>{t("Supplement rate")}</th>
                <th>{t("Avg review days")}</th>
                <th>{t("Median review days")}</th>
                <th>{t("Avg payment days")}</th>
                <th>{t("Median payment days")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.dimension}:${row.value}:${row.currency}`}>
                  <td>{t(labels[row.dimension] ?? row.dimension)}</td>
                  <td>{valueLabel(row)}</td>
                  <td>{row.currency}</td>
                  <td>{row.claims}</td>
                  <td>{row.items}</td>
                  <td>{money(row.amountMinor, row.currency)}</td>
                  <td>{row.approved}</td>
                  <td>{row.rejected}</td>
                  <td>
                    {rate(row) == null ? "—" : `${rate(row)!.toFixed(1)}%`}
                  </td>
                  <td>{row.paid}</td>
                  <td>{row.onHold}</td>
                  <td>{row.slaOverdue}</td>
                  <td>{row.firstReviewOverdue}</td>
                  <td>
                    {row.supplementRate == null
                      ? "—"
                      : `${(row.supplementRate * 100).toFixed(1)}%`}
                  </td>
                  {[
                    row.averageReviewDays,
                    row.medianReviewDays,
                    row.averagePaymentDays,
                    row.medianPaymentDays,
                  ].map((days, index) => (
                    <td key={index}>{days == null ? "—" : days.toFixed(2)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && !busy && (
          <Empty>{t("No submitted cases match the filters.")}</Empty>
        )}
        <p className="heading-note">
          {t(
            "Approval rate = approved ÷ (approved + rejected). No decisions displays —. Claims count distinct applications; items count products. Currencies stay separate. Groups overlap and must not be summed into a grand total. CSV amounts use minor units. Export queries the latest matching data and records an audit event.",
          )}
        </p>
        <p className="heading-note">
          {t(
            "Cycle times use elapsed calendar days: submission to final review decision, and authorization to confirmed payment. Missing events display —. Supplement rate counts cases that ever required more information. First review overdue counts open cases with no review action beyond the configured review SLA (default 7 days).",
          )}
        </p>
      </Panel>
    </>
  );
}
