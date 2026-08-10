import { ArrowUpRight, LockKeyhole } from "lucide-react";

import { useAnalyticsResource } from "../api/useApiResource.js";
import AnalyticsState from "../components/Common/AnalyticsState.jsx";
import ScrollReveal from "../components/Common/ScrollReveal.jsx";
import { formatNumber } from "../utils/formatters.js";

const copy = {
  en: {
    eyebrow: "Client portfolio",
    title: "Client Intelligence",
    description: "Aggregate customer-type and geographic signals from the latest processed run.",
    clients: "Clients",
    typeMix: "Inferred customer type mix",
    rfm: "RFM preparation",
    rfmStatus: "Prepared descriptive inputs",
    rfmReference: "Reference date",
    rfmRecency: "Recency range",
    rfmFrequency: "Frequency field",
    rfmMonetary: "Monetary field",
    geography: "Customer distribution by wilaya",
    revenue: "Revenue",
    orders: "Orders",
    basket: "Average basket",
    pending: "Pending analytical decision",
    segmentation: "Segmentation thresholds are not connected because no approved client-segmentation notebook is present.",
    risk: "Retention risk thresholds are not connected because no approved methodology is present.",
    privacy: "This view intentionally excludes customer names, identifiers, phone numbers, addresses, and individual records.",
    openWilayas: "Open wilaya intelligence",
  },
  fr: {
    rfm: "Preparation RFM",
    rfmStatus: "Indicateurs descriptifs prepares",
    rfmReference: "Date de reference",
    rfmRecency: "Plage de recence",
    rfmFrequency: "Champ frequence",
    rfmMonetary: "Champ monetaire",
    eyebrow: "Portefeuille clients",
    title: "Intelligence clients",
    description: "Signaux agrégés par type de client et par géographie issus du dernier traitement.",
    clients: "Clients",
    typeMix: "Répartition par type de client",
    geography: "Répartition des clients par wilaya",
    revenue: "Revenu",
    orders: "Commandes",
    basket: "Panier moyen",
    pending: "Décision analytique en attente",
    segmentation: "Les seuils de segmentation ne sont pas connectés : aucun notebook approuvé de segmentation client n’est présent.",
    risk: "Les seuils de risque de rétention ne sont pas connectés : aucune méthodologie approuvée n’est présente.",
    privacy: "Cette vue exclut volontairement les noms, identifiants, téléphones, adresses et fiches individuelles.",
    openWilayas: "Ouvrir l’intelligence wilayas",
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
