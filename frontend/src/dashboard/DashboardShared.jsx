import React from "react";
import { AlertCircle, LoaderCircle } from "lucide-react";


export function DashboardLoading({ message = "Loading live analytics…" }) {
  return <div className="analytics-state"><LoaderCircle className="analytics-spin" size={20} />{message}</div>;
}

export function DashboardError({ message, onRetry }) {
  return (
    <div className="analytics-error" role="alert">
      <AlertCircle size={19} />
      <span>{message || "Unable to load analytics."}</span>
      {onRetry && <button type="button" onClick={onRetry}>Retry</button>}
    </div>
  );
}

export function StatCard({ label, value, hint, icon: Icon, tone = "blue" }) {
  return (
    <article className={`analytics-stat analytics-${tone}`}>
      <div className="analytics-stat-top">
        <span>{label}</span>
        {Icon && <span className="analytics-stat-icon"><Icon size={19} /></span>}
      </div>
      <strong>{value ?? "—"}</strong>
      {hint && <small>{hint}</small>}
    </article>
  );
}

export function SectionCard({ title, subtitle, children, className = "" }) {
  return (
    <section className={`analytics-panel ${className}`}>
      <div className="analytics-panel-heading">
        <div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div>
      </div>
      {children}
    </section>
  );
}

export function EmptyAnalytics({ children = "No analytics are available for this period." }) {
  return <div className="analytics-empty">{children}</div>;
}
