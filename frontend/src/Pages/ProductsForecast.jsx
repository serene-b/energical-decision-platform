import { Clock3 } from "lucide-react";

import { useAnalyticsResource } from "../api/useApiResource.js";
import AnalyticsState from "../components/Common/AnalyticsState.jsx";
import ScrollReveal from "../components/Common/ScrollReveal.jsx";
import { formatNumber } from "../utils/formatters.js";

const copy = {
  en: {
    eyebrow: "Products and forecast",
    title: "Product signals are ready; forecasting is pending",
    description: "Product aggregates use reliable catalogue matches. The notebook forecasting experiments are visible as a boundary, not as a production prediction.",
    pending: "Forecast model selection pending approval",
    reason: "No model is presented as truth until the experimental comparison is approved.",
    history: "Revenue history available to forecasting",
    months: "months",
    products: "Top products",
  },
  fr: {
    eyebrow: "Produits et prévisions",
    title: "Les signaux produit sont prêts ; la prévision est en attente",
    description: "Les agrégats produit utilisent les correspondances catalogue fiables. Les expériences de prévision restent une frontière, pas une prédiction de production.",
    pending: "Sélection du modèle de prévision en attente",
    reason: "Aucun modèle ne sera présenté comme vérité avant l’approbation de la comparaison expérimentale.",
    history: "Historique de revenu disponible",
    months: "mois",
    products: "Produits principaux",
  },
};

function ProductsForecast({ language = "en" }) {
  const text = copy[language] || copy.en;
  const resource = useAnalyticsResource("products");
  const data = resource.data;
  const forecastResource = useAnalyticsResource("forecast");

  return (
    <section className="page-shell calm-page">
      <ScrollReveal><header className="calm-page-header"><div><p className="section-eyebrow">{text.eyebrow}</p><h2>{text.title}</h2><p>{text.description}</p></div><span className="pending-badge"><Clock3 size={14} />{text.pending}</span></header></ScrollReveal>
      <AnalyticsState {...resource} language={language}>
        {data && <>
          <div className="calm-content-grid">
            <ScrollReveal className="calm-section calm-section--wide" delay={80}><section><div className="calm-section-heading"><div><p className="section-eyebrow">{text.products}</p><h3>{text.products}</h3></div></div><div className="product-list">{(data.top_products || []).map((row, index) => <div className="product-row" key={row.label}><span>{String(index + 1).padStart(2, "0")}</span><strong>{row.label}</strong><small>{row.revenue?.toLocaleString()} DZD · {formatNumber(row.orders, language)} orders</small></div>)}</div></section></ScrollReveal>
            <ScrollReveal className="calm-section" delay={120}><section><div className="calm-section-heading"><div><p className="section-eyebrow">{text.pending}</p><h3>{text.pending}</h3></div></div><p className="calm-section-copy">{forecastResource.data?.reason || text.reason}</p><div className="forecast-history-note"><strong>{forecastResource.data?.history?.length || 0}</strong><span>{text.history} · {text.months}</span></div></section></ScrollReveal>
          </div>
        </>}
      </AnalyticsState>
    </section>
  );
}

export default ProductsForecast;
