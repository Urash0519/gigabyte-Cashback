import { useEffect, useRef, useState } from "react";
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
    return row.value;
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
          <h1>Reports</h1>
          <p>Promotion performance, case operations and payment outcomes.</p>
        </div>
        <button
          className="button button-light"
          disabled={!report || busy || !rows.length}
          onClick={() => void csv()}
        >
          Export latest matching data
        </button>
      </div>
      <Panel title="Report filters">
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
            label="Campaign"
            value={filters.campaignId}
            onChange={(event) => update("campaignId", event.target.value)}
          >
            <option value="">All campaigns</option>
            {campaigns.map((c) => (
              <option value={c.id} key={c.id}>
                {c.data.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Campaign market"
            value={filters.market}
            onChange={(event) => update("market", event.target.value)}
          >
            <option value="">All markets</option>
            {markets.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </SelectField>
          <Field
            label="Submitted from (inclusive, UTC)"
            type="date"
            value={filters.from}
            onChange={(event) => update("from", event.target.value)}
          />
          <Field
            label="Submitted until (exclusive, UTC)"
            type="date"
            value={filters.to}
            onChange={(event) => update("to", event.target.value)}
          />
          <div>
            <button className="button button-primary" disabled={busy}>
              {busy ? "Loading…" : "Apply filters"}
            </button>
          </div>
        </form>
      </Panel>
      {error && (
        <p className="message error" role="alert">
          {error}
        </p>
      )}
      <Panel title="Grouped results">
        <div className="toolbar">
          <SelectField
            label="Dimension"
            value={dimension}
            onChange={(event) => setDimension(event.target.value)}
          >
            <option value="">All dimensions</option>
            {dimensions.map((d) => (
              <option key={d} value={d}>
                {labels[d] ?? d}
              </option>
            ))}
          </SelectField>
        </div>
        <p className="muted">
          Date basis: {report?.dateBasis ?? "SubmittedAt"} · Time zone:{" "}
          {report?.timeZone ?? "UTC"} · Generated {date(report?.generatedAt)}
        </p>
        <p className="muted">
          Applied scope:{" "}
          {campaigns.find((c) => c.id === applied.campaignId)?.data.name ??
            "All campaigns"}{" "}
          · {applied.market || "All markets"} · {applied.from || "Beginning"}{" "}
          inclusive → {applied.to || "No end"} exclusive.
        </p>
        <div className="table-wrap" aria-busy={busy}>
          <table>
            <thead>
              <tr>
                <th>Dimension</th>
                <th>Value</th>
                <th>Currency</th>
                <th>Claims</th>
                <th>Items</th>
                <th>Claimed amount</th>
                <th>Approved</th>
                <th>Rejected</th>
                <th>Approval rate</th>
                <th>Paid claims</th>
                <th>On hold</th>
                <th>SLA overdue</th>
                <th>First review overdue</th>
                <th>Supplement rate</th>
                <th>Avg review days</th>
                <th>Median review days</th>
                <th>Avg payment days</th>
                <th>Median payment days</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.dimension}:${row.value}:${row.currency}`}>
                  <td>{labels[row.dimension] ?? row.dimension}</td>
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
          <Empty>No submitted cases match the filters.</Empty>
        )}
        <p className="heading-note">
          Approval rate = approved ÷ (approved + rejected). No decisions
          displays —. Claims count distinct applications; items count products.
          Currencies stay separate. Groups overlap and must not be summed into a
          grand total. CSV amounts use minor units. Export queries the latest
          matching data and records an audit event.
        </p>
        <p className="heading-note">
          Cycle times use elapsed calendar days: submission to final review
          decision, and authorization to confirmed payment. Missing events
          display —. Supplement rate counts cases that ever required more
          information. First review overdue counts open cases with no review
          action beyond the configured review SLA (default 7 days).
        </p>
      </Panel>
    </>
  );
}
