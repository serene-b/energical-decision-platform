import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, Sparkles, X } from "lucide-react";

import { useAnalyticsResource } from "../api/useApiResource.js";
import AnalyticsState from "../components/Common/AnalyticsState.jsx";
import AlgeriaMap from "../components/Wilaya/AlgeriaMap.jsx";
import ScrollReveal from "../components/Common/ScrollReveal.jsx";
import { formatNumber } from "../utils/formatters.js";

const copy = {
  en: {
    eyebrow: "Regional Performance",
    title: "Wilaya Intelligence",
    description: "Explore sales revenue, order volumes, client distribution, and regional growth across Algeria.",
    active: "Active Wilayas",
    top: "Top Wilaya",
    revenue: "Total Revenue",
    orders: "Total Orders",
    clients: "Clients",
    share: "Market Share",
    growth: "MoM Growth",
    map: "Algeria Regional Map",
    ranking: "Wilaya Rankings",
    open: "Explore Details",
    close: "Close Panel",
    askAi: "Ask Assistant",
    noMetrics: "No orders recorded for this wilaya in the selected period.",
    boundary: "No Order History",
    scope: "Live Order Scope",
    outside: "Click outside or press Escape to close.",
    notes: "Data & Methodology",
  },
  fr: {
    eyebrow: "Performance Régionale",
    title: "Intelligence des Wilayas",
    description: "Analysez le chiffre d’affaires, les volumes de commandes et la croissance par wilaya en Algérie.",
    active: "Wilayas Actives",
    top: "Wilaya en Tête",
    revenue: "Chiffre d’Affaires",
    orders: "Commandes",
    clients: "Clients",
    share: "Part Régionale",
    growth: "Croissance MoM",
    map: "Carte d’Algérie",
    ranking: "Classement des Wilayas",
    open: "Voir le Détail",
    close: "Fermer",
    askAi: "Demander à l’IA",
    noMetrics: "Aucune commande enregistrée pour cette wilaya sur la période.",
    boundary: "Aucune Commande",
    scope: "Périmètre Commandes",
    outside: "Cliquez à l’extérieur ou appuyez sur Échap pour fermer.",
    notes: "Méthodologie & Données",
  },
};

function moneyInMillions(value) {
  return `${(Number(value || 0) / 1_000_000).toFixed(1)}M DZD`;
}

function WilayaIntelligence({ language = "en", onAskAI }) {
  const text = copy[language] || copy.en;
  const resource = useAnalyticsResource("wilayas");
  const data = resource.data;
  const [selectedId, setSelectedId] = useState(null);
  const displayWilayas = useMemo(() => (data?.wilayas || []).filter((item) => item.geography_status === "valid_wilaya").map((item) => ({ ...item, revenue: Number(item.revenue || 0), share: Number(item.share || 0) })).sort((left, right) => Number(right.revenue || 0) - Number(left.revenue || 0)), [data]);
  const selected = useMemo(() => displayWilayas.find((item) => item.id === selectedId) || null, [displayWilayas, selectedId]);
  const mapWilayas = useMemo(() => displayWilayas.filter((item) => item.id).map((item) => ({ ...item, name: item.label, revenue: Number(item.revenue || 0) / 1_000_000 })), [displayWilayas]);
  const methodologyNotes = resource.response?.warnings?.length ? resource.response.warnings : data?.scope?.notes || [];

  useEffect(() => {
    if (!selectedId) return undefined;
    const handleKeyDown = (event) => { if (event.key === "Escape") setSelectedId(null); };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId]);

  const selectWilaya = (id) => setSelectedId(id);

  return (
    <section className="page-shell calm-page">
      <ScrollReveal><header className="calm-page-header"><div><p className="section-eyebrow">{text.eyebrow}</p><h2>{text.title}</h2><p>{text.description}</p></div><span className="data-source-badge"><i aria-hidden="true" />{data?.scope?.rows_used?.realized_orders || 0} realized orders</span></header></ScrollReveal>
      <AnalyticsState {...resource} language={language}>
        {data && <>
          <ScrollReveal delay={60}><section className="metric-strip metric-strip--three"><div className="metric-strip-item metric-strip-item--primary"><span>{text.active}</span><strong>{formatNumber(data.active_wilayas, language)}</strong><small>{text.scope}</small></div><div className="metric-strip-item"><span>{text.top}</span><strong>{displayWilayas?.[0]?.label || "—"}</strong><small>{moneyInMillions(displayWilayas?.[0]?.revenue)}</small></div><div className="metric-strip-item"><span>{text.revenue}</span><strong>{moneyInMillions(displayWilayas.reduce((sum, item) => sum + Number(item.revenue || 0), 0))}</strong><small>{text.share}</small></div><div className="metric-strip-item"><span>{text.orders}</span><strong>{formatNumber(data.scope?.rows_used?.realized_orders || 0, language)}</strong><small>{text.clients}</small></div></section></ScrollReveal>
          <ScrollReveal className="calm-section calm-section--map" delay={100}><section><div className="calm-section-heading"><div><p className="section-eyebrow">{text.map}</p><h3>{text.map}</h3></div><span>{mapWilayas.length} mapped areas</span></div><AlgeriaMap wilayas={mapWilayas} selectedWilayaId={selectedId} selectedWilayaName={selected?.label || null} onSelect={selectWilaya} onResetSelection={() => setSelectedId(null)} onAskAI={onAskAI} language={language} /></section></ScrollReveal>
          <ScrollReveal className="calm-section calm-section--alerts" delay={140}><section><div className="calm-section-heading"><div><p className="section-eyebrow">{text.ranking}</p><h3>{text.ranking}</h3></div></div><div className="wilaya-table"><div className="wilaya-table-head"><span>{text.top}</span><span>{text.revenue}</span><span>{text.orders}</span><span>{text.share}</span></div>{displayWilayas.slice(0, 15).map((row, index) => <button type="button" className={`wilaya-table-row ${selectedId === row.id ? "is-selected" : ""}`} key={`${row.label}-${index}`} onClick={() => selectWilaya(row.id)}><span><b>{String(index + 1).padStart(2, "0")}</b><strong>{row.label}</strong></span><strong>{moneyInMillions(row.revenue)}</strong><span>{formatNumber(row.orders, language)}</span><span>{row.share}%</span></button>)}</div></section></ScrollReveal>
          {methodologyNotes.length > 0 && <ScrollReveal delay={180}><details className="calm-disclosure"><summary>{text.notes}</summary><ul>{methodologyNotes.map((note) => <li key={note}>{note}</li>)}</ul></details></ScrollReveal>}
        </>}
      </AnalyticsState>

      {selectedId &&
        createPortal(
          <div
            className="regional-drawer-backdrop"
            role="presentation"
            onMouseDown={() => setSelectedId(null)}
          >
            <aside
              className="regional-drawer"
              role="dialog"
              aria-modal="true"
              aria-labelledby="regional-detail-title"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="icon-button regional-drawer-close"
                onClick={() => setSelectedId(null)}
                aria-label={text.close}
              >
                <X size={18} />
              </button>
              {selected ? (
                <>
                  <p className="section-eyebrow">{text.eyebrow}</p>
                  <h3 id="regional-detail-title">{selected.label}</h3>
                  <dl className="regional-metrics">
                    <div>
                      <dt>{text.revenue}</dt>
                      <dd>{moneyInMillions(selected.revenue)}</dd>
                    </div>
                    <div>
                      <dt>{text.orders}</dt>
                      <dd>{formatNumber(selected.orders, language)}</dd>
                    </div>
                    <div>
                      <dt>{text.clients}</dt>
                      <dd>{formatNumber(selected.clients, language)}</dd>
                    </div>
                    <div>
                      <dt>{text.share}</dt>
                      <dd>{selected.share}%</dd>
                    </div>
                    <div>
                      <dt>{text.growth}</dt>
                      <dd>
                        {selected.growth == null
                          ? "—"
                          : `${selected.growth >= 0 ? "+" : ""}${selected.growth}%`}
                      </dd>
                    </div>
                  </dl>
                  <p className="regional-drawer-note">{text.outside}</p>
                  <button
                    type="button"
                    className="button button--secondary"
                    onClick={() =>
                      onAskAI?.({
                        page: "wilayas",
                        selection_type: "wilaya",
                        selection: selected.label,
                        approved_metrics: {
                          revenue: selected.revenue,
                          orders: selected.orders,
                          clients: selected.clients,
                          share: selected.share,
                          growth: selected.growth,
                        },
                      })
                    }
                  >
                    <Sparkles size={15} />
                    {text.askAi}
                    <ArrowUpRight size={14} />
                  </button>
                </>
              ) : (
                <p>{text.noMetrics}</p>
              )}
            </aside>
          </div>,
          document.body,
        )}
    </section>
  );
}

export default WilayaIntelligence;
