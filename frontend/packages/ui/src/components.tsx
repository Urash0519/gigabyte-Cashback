import {
  useState,
  type ReactNode,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
} from "react";

export function Field({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="field">
      <span>
        {label}
        {props.required ? " *" : ""}
      </span>
      <input {...props} />
    </label>
  );
}
export function SelectField({
  label,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select {...props}>{children}</select>
    </label>
  );
}
export function TextField({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  rows?: number;
}) {
  return (
    <label className="field full">
      <span>{label}</span>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
export function Badge({
  children,
  label,
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <span className={`badge badge-${String(children).toLowerCase()}`}>
      {label ?? children}
    </span>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
export function Panel({
  title,
  children,
  actions,
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>{title}</h2>
        {actions && <div className="actions">{actions}</div>}
      </div>
      {children}
    </section>
  );
}
export function money(minor: number, currency = "EUR") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(
    (minor || 0) / 100,
  );
}
export function date(value?: string | null) {
  return value ? new Date(value).toLocaleString("en-GB") : "—";
}
export function ActionForm({
  label,
  reasonLabel = "Reason / reference",
  onSubmit,
  children,
  disabled,
}: {
  label: string;
  reasonLabel?: string;
  onSubmit: (reason: string) => Promise<unknown>;
  children?: ReactNode;
  disabled?: boolean;
}) {
  const [reason, setReason] = useState("");
  return (
    <form
      className="action-form"
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit(reason);
      }}
    >
      {children}
      <Field
        label={reasonLabel}
        value={reason}
        required
        onChange={(e) => setReason(e.target.value)}
      />
      <button disabled={disabled} className="button button-primary">
        {label}
      </button>
    </form>
  );
}
export function downloadCsv(name: string, content: string) {
  const blob = new Blob(["\ufeff", content], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
