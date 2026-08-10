import { ArrowUpRight, CheckCircle2, CircleAlert } from "lucide-react";

import { useAnalyticsResource } from "../api/useApiResource.js";
import AnalyticsState from "../components/Common/AnalyticsState.jsx";
import ScrollReveal from "../components/Common/ScrollReveal.jsx";
import { formatNumber } from "../utils/formatters.js";

const copy = {
  en: {
    eyebrow: "Executive snapshot",
    title: "Business performance at a glance",
    description: "Approved revenue, order, customer, and quality signals from the latest processed run.",
    source: "Latest processed run",
    revenue: "Revenue",
    orders: "Realized orders",
    basket: "Average basket",
    clients: "Clients",
    trend: "Revenue Trend",
    trendNote: "Realized sales by available month",
    quality: "Data quality",
    qualityReady: "Quality checks completed",
    qualityWarnings: "Quality review required",
    alerts: "Latest Alerts",
    noAlerts: "No factual quality alerts for this run.",
    viewSales: "Open sales intelligence",
    viewClients: "Open client intelligence",
    viewWilayas: "Open wilaya intelligence",
    open: "Open",
    rows: "rows",
  },
  fr: {
    eyebrow: "Synthèse exécutive",
    title: "Performance commerciale en un coup d’œil",
    description: "Indicateurs approuvés de revenu, commandes, clients et qualité issus du dernier traitement.",
    source: "Dernier traitement",
    revenue: "Chiffre d’affaires",
    orders: "Commandes confirmées",
    basket: "Panier moyen",
    clients: "Clients",
    trend: "Évolution du chiffre d’affaires",
    trendNote: "Ventes confirmées par mois disponible",
    quality: "Qualité des données",
    qualityReady: "Contrôles qualité terminés",
    qualityWarnings: "Revue qualité nécessaire",
    alerts: "Dernières alertes",
    noAlerts: "Aucune alerte factuelle pour ce traitement.",
    viewSales: "Ouvrir l’intelligence ventes",
    viewClients: "Ouvrir l’intelligence clients",
    viewWilayas: "Ouvrir l’intelligence wilayas",
    open: "Ouvrir",
    rows: "lignes",
  },
};

function money(value, language) {
  const number = Number(value || 0);
  if (Math.abs(number) >= 1_000_000) return `${(number / 1_000_000).toFixed(1)}M DZD`;
  return `${formatNumber(Math.round(number), language)} DZD`;
}

function TrendChart({ points, language, partialMonths = [], onSelect }) {
  if (!points?.length) return <div className="calm-empty">No monthly sales points are available.</div>;
  const width = 760;
  const height = 250;
  const padding = { top: 24, right: 24, bottom: 38, left: 16 };
  const values = points.map((point) => Number(point.revenue || 0));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const chartPoints = points.map((point, index) => ({
    ...point,
    x: padding.left + (index / Math.max(points.length - 1, 1)) * (width - padding.left - padding.right),
    y: height - padding.bottom - ((Number(point.revenue || 0) - min) / range) * (height - padding.top - padding.bottom),
  }));
  const line = chartPoints.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `${padding.left},${height - padding.bottom} ${line} ${width - padding.right},${height - padding.bottom}`;

  return (
    <div className="calm-chart-wrap">
      <svg className="calm-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={language === "fr" ? "Évolution mensuelle du revenu" : "Monthly revenue evolution"}>
        <defs>
          <linearGradient id="overviewRevenueFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2].map((lineIndex) => {
          const y = padding.top + (lineIndex / 2) * (height - padding.top - padding.bottom);
          return <line key={lineIndex} className="calm-chart-grid" x1={padding.left} x2={width - padding.right} y1={y} y2={y} />;
        })}
        <polygon points={area} fill="url(#overviewRevenueFill)" />
        <polyline className="calm-chart-line" points={line} />
        {chartPoints.map((point, index) => (
          <g key={point.period}>
            <circle className="calm-chart-point" cx={point.x} cy={point.y} r="5" tabIndex="0" role="button" aria-label={`${point.period}: ${money(point.revenue, language)}`} onClick={() => onSelect?.(point, index)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect?.(point, index); }} />
            <text className="calm-chart-label" x={point.x} y={height - 12} textAnchor="middle">{point.period.slice(5)}{partialMonths.includes(point.period) ? " MTD" : ""}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function Overview({ language = "en", onNavigate, onInsight }) {
  const text = copy[language] || copy.en;
  const resource = useAnalyticsResource("overview");
  const data = resource.data;
  const qualityAlerts = data?.quality?.alerts || data?.alerts || [];

  const selectMetric = (label, key, value, tabId) => {
    onInsight?.({
      page: "overview",
      title: label,
      description: text.description,
      metric_label: label,
      selection: key,
      selection_label: label,
      approved_metrics: { [key]: value },
      suggestions: tabId ? [{ id: `overview-${tabId}`, label: { en: text.open, fr: text.open }, tabId }] : [],
    });
  };

  return (
    <section className="page-shell calm-page">
      <ScrollReveal>
        <header className="calm-page-header">
          <div>
            <p className="section-eyebrow">{text.eyebrow}</p>
            <h2>{text.title}</h2>
            <p>{text.description}</p>
          </div>
          <span className="data-source-badge"><i aria-hidden="true" />{text.source}</span>
        </header>
      </ScrollReveal>

      <AnalyticsState {...resource} language={language}>
        {data && (
          <>
            <ScrollReveal delay={60}>
              <section className="metric-strip" aria-label={text.eyebrow}>
                <button type="button" className="metric-strip-item metric-strip-item--primary" onClick={() => selectMetric(text.revenue, "revenue", data.revenue, "sales")}>
                  <span>{text.revenue}</span><strong>{money(data.revenue, language)}</strong><small>{data.growth_pct == null ? "—" : `${data.growth_pct >= 0 ? "+" : ""}${data.growth_pct}% vs previous month`}</small>
                </button>
                <button type="button" className="metric-strip-item" onClick={() => selectMetric(text.orders, "orders", data.orders, "sales")}>
                  <span>{text.orders}</span><strong>{formatNumber(data.orders, language)}</strong><small>{data.scope?.rows_used?.realized_orders || 0} {text.rows}</small>
                </button>
                <button type="button" className="metric-strip-item" onClick={() => selectMetric(text.basket, "average_basket", data.average_basket, "sales")}>
                  <span>{text.basket}</span><strong>{money(data.average_basket, language)}</strong><small>{text.orders}</small>
                </button>
                <button type="button" className="metric-strip-item" onClick={() => selectMetric(text.clients, "clients", data.clients, "clients")}>
                  <span>{text.clients}</span><strong>{formatNumber(data.clients, language)}</strong><small>{data.top_wilaya?.label || "—"}</small>
                </button>
              </section>
            </ScrollReveal>

            <div className="calm-content-grid">
              <ScrollReveal className="calm-section calm-section--wide" delay={100}>
                <section>
                  <div className="calm-section-heading"><div><p className="section-eyebrow">{text.trend}</p><h3>{text.trend}</h3><p>{text.trendNote}</p></div><span>{data.trend?.length || 0} months</span></div>
                  <TrendChart points={data.trend} language={language} partialMonths={data.partial_months} onSelect={(point) => selectMetric(point.period, "revenue", point.revenue, "sales")} />
                </section>
              </ScrollReveal>

              <ScrollReveal className="calm-section" delay={140}>
                <section>
                  <div className="calm-section-heading"><div><p className="section-eyebrow">{text.quality}</p><h3>{qualityAlerts.length ? text.qualityWarnings : text.qualityReady}</h3></div>{qualityAlerts.length ? <CircleAlert size={18} /> : <CheckCircle2 size={18} />}</div>
                  <p className="calm-section-copy">{qualityAlerts.length ? `${qualityAlerts.length} ${text.alerts.toLowerCase()}.` : text.noAlerts}</p>
                  <div className="calm-actions">
                    <button type="button" className="text-link" onClick={() => onNavigate?.("upload")}>{text.open} <ArrowUpRight size={14} /></button>
                  </div>
                </section>
              </ScrollReveal>
            </div>

            <ScrollReveal className="calm-section calm-section--alerts" delay={180}>
              <section>
                <div className="calm-section-heading"><div><p className="section-eyebrow">{text.alerts}</p><h3>{text.alerts}</h3></div><button type="button" className="text-link" onClick={() => onNavigate?.("alerts")}>{text.open} <ArrowUpRight size={14} /></button></div>
                {qualityAlerts.length ? <ul className="signal-list">{qualityAlerts.slice(0, 6).map((alert, index) => <li key={`${alert.code}-${index}`}><span className={`signal-dot signal-dot--${alert.severity || "info"}`} /><div><strong>{alert.title || alert.code}</strong><p>{alert.message}</p></div><small>{alert.count || 0}</small></li>)}</ul> : <p className="calm-section-copy">{text.noAlerts}</p>}
              </section>
            </ScrollReveal>
          </>
        )}
      </AnalyticsState>
    </section>
  );
}

export default Overview;
