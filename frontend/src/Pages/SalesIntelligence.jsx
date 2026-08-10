import { ArrowUpRight } from "lucide-react";

import { useAnalyticsResource } from "../api/useApiResource.js";
import AnalyticsState from "../components/Common/AnalyticsState.jsx";
import ScrollReveal from "../components/Common/ScrollReveal.jsx";
import { formatNumber } from "../utils/formatters.js";

const copy = {
  en: {
    eyebrow: "Sales performance",
    title: "Sales Intelligence",
    description: "Track revenue, transaction volume, customer type, channels, growth, and unusual sales movements.",
    revenue: "Revenue",
    orders: "Realized orders",
    basket: "Average basket",
    growth: "Sales growth rate",
    trend: "Sales revenue trend",
    customerType: "Customer mix",
    payment: "Payment method",
    delivery: "Delivery method",
    label: "Segment",
    share: "Share",
    scope: "Scope",
    notes: "Methodology notes",
    noRows: "No approved rows are available for this breakdown.",
    openClients: "Open client intelligence",
    open: "Open",
  },
  fr: {
    eyebrow: "Performance commerciale",
    title: "Intelligence des ventes",
    description: "Suivez le chiffre d’affaires, les transactions, les types de clients, les canaux, la croissance et les variations inhabituelles.",
    revenue: "Chiffre d’affaires",
    orders: "Commandes confirmées",
    basket: "Panier moyen",
    growth: "Taux de croissance",
    trend: "Évolution du chiffre d’affaires",
    customerType: "Répartition des clients",
    payment: "Mode de paiement",
    delivery: "Mode de livraison",
    label: "Segment",
    share: "Part",
    scope: "Périmètre",
    notes: "Notes méthodologiques",
    noRows: "Aucune ligne approuvée n’est disponible pour cette répartition.",
    openClients: "Ouvrir l’intelligence clients",
    open: "Ouvrir",
  },
};

function money(value, language) {
  const number = Number(value || 0);
  return Math.abs(number) >= 1_000_000 ? `${(number / 1_000_000).toFixed(1)}M DZD` : `${formatNumber(Math.round(number), language)} DZD`;
}

function periodLabel(period, partialMonths = []) {
  return partialMonths.includes(period) ? `${period} MTD` : period;
}

function MiniTrend({ points, language, partialMonths = [], onSelect }) {
  if (!points?.length) return <p className="calm-empty">No trend data.</p>;
  const width = 700;
  const height = 230;
  const max = Math.max(...points.map((item) => Number(item.revenue || 0)), 1);
  const line = points.map((item, index) => {
    const x = 18 + index / Math.max(points.length - 1, 1) * (width - 36);
    const y = 188 - Number(item.revenue || 0) / max * 150;
    return `${x},${y}`;
  }).join(" ");
  return (
    <div className="calm-chart-wrap">
      <svg className="calm-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={language === "fr" ? "Évolution du revenu" : "Revenue trend"}>
        {[0, 1, 2].map((index) => <line key={index} className="calm-chart-grid" x1="18" x2="682" y1={38 + index * 75} y2={38 + index * 75} />)}
        <polyline className="calm-chart-line" points={line} />
        {points.map((item, index) => {
          const [x, y] = line.split(" ")[index].split(",");
          return <g key={item.period}><circle className="calm-chart-point" cx={x} cy={y} r="5" tabIndex="0" role="button" aria-label={`${periodLabel(item.period, partialMonths)}: ${money(item.revenue, language)}`} onClick={() => onSelect?.(item)} /><text className="calm-chart-label" x={x} y="214" textAnchor="middle">{item.period.slice(5)}{partialMonths.includes(item.period) ? " MTD" : ""}</text></g>;
        })}
      </svg>
    </div>
  );
}

function Breakdown({ title, rows, data, language, onSelect }) {
  const total = rows.reduce((sum, row) => sum + Number(row.revenue || 0), 0);
  return (
    <section className="calm-section">
      <div className="calm-section-heading"><div><p className="section-eyebrow">{title}</p><h3>{title}</h3></div></div>
      {rows.length ? <div className="breakdown-list">{rows.slice(0, 8).map((row) => <button type="button" className="breakdown-row" key={row.label} onClick={() => onSelect?.(row)}><span className="breakdown-label"><strong>{row.label}</strong><small>{formatNumber(row.orders, language)} orders</small></span><span className="breakdown-bar"><i style={{ width: `${total ? Math.max(3, row.revenue / total * 100) : 3}%` }} /></span><strong>{money(row.revenue, language)}</strong></button>)}</div> : <p className="calm-empty">{data.noRows}</p>}
    </section>
  );
}

function SalesIntelligence({ language = "en", onNavigate, onInsight }) {
  const text = copy[language] || copy.en;
  const resource = useAnalyticsResource("sales");
  const data = resource.data;

  const select = (label, row) => onInsight?.({
    page: "sales",
    title: `${label} · ${row.label || ""}`,
    description: text.description,
    metric_label: text.revenue,
    selection: row.label,
    selection_label: row.label,
    approved_metrics: { revenue: row.revenue, orders: row.orders, average_basket: row.average_basket },
    suggestions: [{ id: "sales-clients", label: { en: text.openClients, fr: text.openClients }, tabId: "clients" }],
  });

  return (
    <section className="page-shell calm-page">
      <ScrollReveal><header className="calm-page-header"><div><p className="section-eyebrow">{text.eyebrow}</p><h2>{text.title}</h2><p>{text.description}</p></div><span className="data-source-badge"><i aria-hidden="true" />{data?.scope?.rows_used?.realized_orders || 0} orders in scope</span></header></ScrollReveal>
      <AnalyticsState {...resource} language={language}>
        {data && <>
          <ScrollReveal delay={60}><section className="metric-strip metric-strip--three"><div className="metric-strip-item metric-strip-item--primary"><span>{text.revenue}</span><strong>{money(data.total_revenue, language)}</strong><small>{data.period_start || "—"} → {periodLabel(data.period_end, data.partial_months)}</small></div><div className="metric-strip-item"><span>{text.orders}</span><strong>{formatNumber(data.total_orders, language)}</strong><small>{text.revenue}</small></div><div className="metric-strip-item"><span>{text.basket}</span><strong>{money(data.average_basket, language)}</strong><small>{text.orders}</small></div><div className="metric-strip-item"><span>{text.growth}</span><strong className={data.growth_pct >= 0 ? "value-positive" : "value-neutral"}>{data.growth_pct == null ? "—" : `${data.growth_pct >= 0 ? "+" : ""}${data.growth_pct}%`}</strong><small>{periodLabel(data.period_end, data.partial_months)}</small></div></section></ScrollReveal>
          <div className="calm-content-grid">
            <ScrollReveal className="calm-section calm-section--wide" delay={100}><section><div className="calm-section-heading"><div><p className="section-eyebrow">{text.trend}</p><h3>{text.trend}</h3></div><span>{data.trend?.length || 0} months</span></div><MiniTrend points={data.trend} language={language} partialMonths={data.partial_months} onSelect={(row) => select(text.trend, row)} /></section></ScrollReveal>
            <ScrollReveal className="calm-section" delay={140}><section><div className="calm-section-heading"><div><p className="section-eyebrow">{text.scope}</p><h3>{text.scope}</h3></div></div><dl className="scope-list"><div><dt>Run</dt><dd>{data.scope?.run_id?.slice(0, 8) || "—"}</dd></div><div><dt>Datasets</dt><dd>{data.scope?.datasets?.join(", ") || "—"}</dd></div><div><dt>Orders used</dt><dd>{formatNumber(data.scope?.rows_used?.orders || 0, language)}</dd></div></dl><button type="button" className="text-link" onClick={() => onNavigate?.("clients")}>{text.openClients}<ArrowUpRight size={14} /></button></section></ScrollReveal>
          </div>
          <div className="breakdown-grid">
            <ScrollReveal delay={120}><Breakdown title={text.customerType} rows={data.customer_types || []} data={text} language={language} onSelect={(row) => select(text.customerType, row)} /></ScrollReveal>
            <ScrollReveal delay={160}><Breakdown title={text.payment} rows={data.payment_methods || []} data={text} language={language} onSelect={(row) => select(text.payment, row)} /></ScrollReveal>
            <ScrollReveal delay={200}><Breakdown title={text.delivery} rows={data.delivery_methods || []} data={text} language={language} onSelect={(row) => select(text.delivery, row)} /></ScrollReveal>
          </div>
          {data.scope?.notes?.length > 0 && <ScrollReveal delay={220}><details className="calm-disclosure"><summary>{text.notes}</summary><ul>{data.scope.notes.map((note) => <li key={note}>{note}</li>)}</ul></details></ScrollReveal>}
        </>}
      </AnalyticsState>
    </section>
  );
}

export default SalesIntelligence;
