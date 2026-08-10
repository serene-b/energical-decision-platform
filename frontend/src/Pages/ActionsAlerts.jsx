import { AlertTriangle, Clock3 } from "lucide-react";

import { useAnalyticsResource } from "../api/useApiResource.js";
import AnalyticsState from "../components/Common/AnalyticsState.jsx";
import ScrollReveal from "../components/Common/ScrollReveal.jsx";

const copy = {
  en: {
    eyebrow: "Decision center",
    title: "Factual signals that need attention",
    description: "Quality alerts and analytical boundaries from the latest processed run. Recommendations are not invented when methodology is missing.",
    noAlerts: "No factual alerts were emitted for this run.",
    pending: "Some decision logic remains pending approval.",
    count: "count",
  },
  fr: {
    eyebrow: "Centre de décision",
    title: "Signaux factuels à examiner",
    description: "Alertes qualité et frontières analytiques du dernier traitement. Aucune recommandation n’est inventée lorsqu’une méthodologie manque.",
    noAlerts: "Aucune alerte factuelle n’a été émise pour ce traitement.",
    pending: "Une partie de la logique de décision reste en attente d’approbation.",
    count: "nombre",
  },
};

function ActionsAlerts({ language = "en" }) {
  const text = copy[language] || copy.en;
  const resource = useAnalyticsResource("decisions");
  const data = resource.data;
  return (
    <section className="page-shell calm-page">
      <ScrollReveal><header className="calm-page-header"><div><p className="section-eyebrow">{text.eyebrow}</p><h2>{text.title}</h2><p>{text.description}</p></div><span className="pending-badge"><Clock3 size={14} />{text.pending}</span></header></ScrollReveal>
      <AnalyticsState {...resource} language={language}>
        {data && <ScrollReveal delay={80}><section className="calm-section calm-section--alerts"><div className="calm-section-heading"><div><p className="section-eyebrow">{text.eyebrow}</p><h3>{data.alerts?.length || 0} signals</h3></div></div>{data.alerts?.length ? <ul className="signal-list">{data.alerts.map((alert, index) => <li key={`${alert.code}-${index}`}><span className={`signal-dot signal-dot--${alert.severity || "info"}`}><AlertTriangle size={13} /></span><div><strong>{alert.title || alert.code}</strong><p>{alert.message}</p></div><small>{alert.count || 0} {text.count}</small></li>)}</ul> : <p className="calm-section-copy">{text.noAlerts}</p>}</section></ScrollReveal>}
      </AnalyticsState>
    </section>
  );
}

export default ActionsAlerts;
