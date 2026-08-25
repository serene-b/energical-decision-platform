import { ArrowUpRight, LockKeyhole } from "lucide-react";

import { useAnalyticsResource } from "../api/useApiResource.js";
import AnalyticsState from "../components/Common/AnalyticsState.jsx";
import ScrollReveal from "../components/Common/ScrollReveal.jsx";
import { formatNumber } from "../utils/formatters.js";

const copy = {
  en: {
    eyebrow: "Client Portfolio",
    title: "Client Intelligence",
    description: "Customer segment breakdown, B2B vs B2C profiles, and geographic buyer distribution.",
    clients: "Active Clients",
    typeMix: "Customer Segment Breakdown",
    rfm: "RFM Customer Value Profiling",
    rfmStatus: "Dynamic RFM Metrics",
    rfmReference: "Reference Date",
    rfmRecency: "Recency Window",
    rfmFrequency: "Order Frequency",
    rfmMonetary: "Monetary Value",
    geography: "Customer Distribution by Wilaya",
    revenue: "Total Revenue",
    orders: "Total Orders",
    basket: "Average Order Value",
    pending: "Advanced Segmentation",
    segmentation: "RFM segmentation is computed dynamically from historical order intervals.",
    risk: "Retention risk flags identify accounts with over 90 days since their last recorded order.",
    privacy: "Commercial records are aggregated to provide actionable executive business intelligence.",
    openWilayas: "Explore Wilaya Intelligence",
  },
  fr: {
    rfm: "Profilage Valeur Client (RFM)",
    rfmStatus: "Indicateurs RFM Dynamiques",
    rfmReference: "Date de Référence",
    rfmRecency: "Fenêtre de Récence",
    rfmFrequency: "Fréquence des Commandes",
    rfmMonetary: "Valeur Monétaire",
    eyebrow: "Portefeuille Clients",
    title: "Intelligence Clients",
    description: "Répartition par segment client, profils B2B vs B2C et distribution géographique des acheteurs.",
    clients: "Clients Actifs",
    typeMix: "Répartition des Segments",
    geography: "Répartition des Clients par Wilaya",
    revenue: "Chiffre d’Affaires",
    orders: "Commandes",
    basket: "Panier Moyen",
    pending: "Segmentation Avancée",
    segmentation: "La segmentation RFM est calculée dynamiquement à partir des intervalles de commande.",
    risk: "Le risque d'attrition cible les comptes sans réachat depuis plus de 90 jours.",
    privacy: "Les données commerciales sont agrégées pour faciliter l'aide à la décision stratégique.",
    openWilayas: "Explorer l’Intelligence Wilayas",
  },
};

function money(value) {
  const number = Number(value || 0);
  return Math.abs(number) >= 1_000_000 ? `${(number / 1_000_000).toFixed(1)}M DZD` : `${Math.round(number).toLocaleString()} DZD`;
}

function ClientIntelligence({ language = "en", onNavigate, onInsight }) {
  const text = copy[language] || copy.en;
  const resource = useAnalyticsResource("clients");
  const data = resource.data;
  const selectType = (row) => onInsight?.({
    page: "clients",
    title: `${text.typeMix} · ${row.label}`,
    description: text.description,
    metric_label: text.clients,
    selection: row.label,
    selection_label: row.label,
    approved_metrics: { customers: row.customers, revenue: row.revenue, orders: row.orders },
    suggestions: [{ id: "client-wilayas", label: { en: text.openWilayas, fr: text.openWilayas }, tabId: "wilayas" }],
  });

  return (
    <section className="page-shell calm-page">
      <ScrollReveal><header className="calm-page-header"><div><p className="section-eyebrow">{text.eyebrow}</p><h2>{text.title}</h2><p>{text.description}</p></div><span className="privacy-badge"><LockKeyhole size={14} />{text.privacy}</span></header></ScrollReveal>
      <AnalyticsState {...resource} language={language}>
        {data && <>
          <ScrollReveal delay={60}><section className="metric-strip metric-strip--three"><div className="metric-strip-item metric-strip-item--primary"><span>{text.clients}</span><strong>{formatNumber(data.total_clients, language)}</strong><small>{data.scope?.datasets?.join(", ") || "—"}</small></div>{(data.customer_types || []).slice(0, 3).map((row) => <button type="button" className="metric-strip-item" key={row.label} onClick={() => selectType(row)}><span>{row.label}</span><strong>{formatNumber(row.customers, language)}</strong><small>{money(row.revenue)}</small></button>)}</section></ScrollReveal>
          <div className="calm-content-grid">
            <ScrollReveal className="calm-section calm-section--wide" delay={100}><section><div className="calm-section-heading"><div><p className="section-eyebrow">{text.typeMix}</p><h3>{text.typeMix}</h3></div></div><div className="client-type-list">{(data.customer_types || []).map((row) => { const total = data.total_clients || 1; return <button type="button" className="client-type-row" key={row.label} onClick={() => selectType(row)}><span><strong>{row.label}</strong><small>{formatNumber(row.customers, language)} {text.clients}</small></span><i><b style={{ width: `${Math.max(3, row.customers / total * 100)}%` }} /></i><span className="client-type-value"><strong>{money(row.revenue)}</strong><small>{formatNumber(row.orders, language)} {text.orders.toLowerCase()}</small></span></button>; })}</div></section></ScrollReveal>
            <ScrollReveal className="calm-section" delay={140}><section><div className="calm-section-heading"><div><p className="section-eyebrow">{text.rfm}</p><h3>{text.rfm}</h3></div></div><p className="calm-section-copy">{text.rfmStatus}</p><dl className="scope-list"><div><dt>{text.rfmReference}</dt><dd>{data.rfm?.reference_date || "—"}</dd></div><div><dt>{text.rfmRecency}</dt><dd>{data.rfm?.recency_days_min == null ? "—" : `${data.rfm.recency_days_min}–${data.rfm.recency_days_max} days`}</dd></div><div><dt>{text.rfmFrequency}</dt><dd>{data.rfm?.frequency_field || "—"}</dd></div><div><dt>{text.rfmMonetary}</dt><dd>{data.rfm?.monetary_field || "—"}</dd></div></dl><p className="calm-section-copy">{text.segmentation}</p><p className="calm-section-copy">{text.risk}</p><button type="button" className="text-link" onClick={() => onNavigate?.("wilayas")}>{text.openWilayas} <ArrowUpRight size={14} /></button></section></ScrollReveal>
          </div>
          <ScrollReveal className="calm-section calm-section--alerts" delay={180}><section><div className="calm-section-heading"><div><p className="section-eyebrow">{text.geography}</p><h3>{text.geography}</h3></div><button type="button" className="text-link" onClick={() => onNavigate?.("wilayas")}>{text.openWilayas} <ArrowUpRight size={14} /></button></div><div className="geography-list">{(data.wilaya_distribution || []).slice(0, 12).map((row) => <div className="geography-row" key={row.label}><span>{row.label}</span><i><b style={{ width: `${Math.max(3, row.customers / Math.max(data.wilaya_distribution?.[0]?.customers || 1, 1) * 100)}%` }} /></i><strong>{formatNumber(row.customers, language)}</strong></div>)}</div></section></ScrollReveal>
        </>}
      </AnalyticsState>
    </section>
  );
}

export default ClientIntelligence;
