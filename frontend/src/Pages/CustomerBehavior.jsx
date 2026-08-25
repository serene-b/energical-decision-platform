import { useState } from "react";
import { ArrowUpRight } from "lucide-react";

import { useAnalyticsResource } from "../api/useApiResource.js";
import AnalyticsState from "../components/Common/AnalyticsState.jsx";
import ScrollReveal from "../components/Common/ScrollReveal.jsx";
import IntegrationSettingsModal from "../components/Common/IntegrationSettingsModal.jsx";
import { formatNumber } from "../utils/formatters.js";

const copy = {
  en: {
    eyebrow: "Digital footprint & acquisition",
    title: "Customer Behavior (GA4)",
    description: "Analyze web traffic, digital acquisition channels, devices, and top-converting product pages.",
    visitors: "Total Visitors",
    sessions: "Total Sessions",
    bounceRate: "Bounce Rate",
    avgDuration: "Avg Session Duration",
    channelsTitle: "Traffic Acquisition Channels",
    devicesTitle: "Device & Platform Mix",
    pagesTitle: "Most Visited Product Pages",
    geoTitle: "Web Traffic by Wilaya",
    share: "Share",
    conversions: "Conversions",
    views: "Pageviews",
    exitRate: "Exit Rate",
    openSales: "Open sales intelligence",
  },
  fr: {
    eyebrow: "Empreinte numérique & acquisition",
    title: "Comportement client (GA4)",
    description: "Analysez le trafic web, les canaux d’acquisition numérique, les appareils et les pages produits les plus consultées.",
    visitors: "Visiteurs uniques",
    sessions: "Sessions totales",
    bounceRate: "Taux de rebond",
    avgDuration: "Durée moyenne",
    channelsTitle: "Canaux d’acquisition de trafic",
    devicesTitle: "Répartition par appareil",
    pagesTitle: "Pages produits les plus consultées",
    geoTitle: "Trafic web par wilaya",
    share: "Part",
    conversions: "Conversions",
    views: "Vues",
    exitRate: "Taux de sortie",
    openSales: "Ouvrir l’intelligence des ventes",
  },
};

function CustomerBehavior({ language = "en", onNavigate, onInsight }) {
  const text = copy[language] || copy.en;
  const resource = useAnalyticsResource("customers");
  const data = resource.data;
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const selectChannel = (row) => onInsight?.({
    page: "behavior",
    title: `${text.channelsTitle} · ${row.channel}`,
    description: text.description,
    metric_label: text.sessions,
    selection: row.channel,
    selection_label: row.channel,
    approved_metrics: { sessions: row.sessions, share: `${row.share}%`, conversions: row.conversions },
    suggestions: [{ id: "behavior-sales", label: { en: text.openSales, fr: text.openSales }, tabId: "sales" }],
  });

  return (
    <section className="page-shell calm-page">
      <ScrollReveal>
        <header className="calm-page-header">
          <div>
            <p className="section-eyebrow">{text.eyebrow}</p>
            <h2>{text.title}</h2>
            <p>{text.description}</p>
          </div>
          <span className={`data-source-badge ${data?._source === "derived_from_orders" ? "data-source-badge--derived" : ""}`}>
            <i aria-hidden="true" />
            {data?._source === "ga4_api"
              ? "Google Analytics 4 Live"
              : data?._source === "csv_upload"
              ? "GA4 Web Analytics CSV"
              : data?._source === "derived_from_orders"
              ? (language === "fr" ? "Comportement dérivé des commandes" : "Derived from Order Signals")
              : "Google Analytics 4"}
          </span>
        </header>
      </ScrollReveal>

      {data?._source === "derived_from_orders" && (
        <ScrollReveal delay={40}>
          <div
            className="platform-warning-banner platform-warning-banner--danger"
            style={{
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "14px",
              flexWrap: "wrap",
            }}
          >
            <span>
              {language === "fr"
                ? "GA4 non connecté : Les canaux d’acquisition et l’intérêt produit ci-dessous sont calculés à partir de vos commandes réelles. Ajoutez vos clés GA4 ou importez web_analytics.csv pour le trafic web en direct."
                : "GA4 Not Configured: Acquisition channels and product interest below are dynamically derived from your uploaded orders. Connect GA4 API or upload web_analytics.csv for live web sessions."}
            </span>
            <button
              type="button"
              className="button button--secondary"
              style={{ padding: "6px 12px", fontSize: "0.82rem", whiteSpace: "nowrap" }}
              onClick={() => setIsSettingsOpen(true)}
            >
              {language === "fr" ? "Configurer GA4" : "Configure GA4"}
            </button>
          </div>
        </ScrollReveal>
      )}

      <IntegrationSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        language={language}
        onSaved={() => {
          setIsSettingsOpen(false);
          resource.retry();
        }}
      />

      <AnalyticsState {...resource} language={language}>
        {data && (
          <>
            {/* Top Metric Strip */}
            <ScrollReveal delay={60}>
              <section className="metric-strip metric-strip--three">
                <div className="metric-strip-item metric-strip-item--primary">
                  <span>{text.visitors}</span>
                  <strong>{formatNumber(data.total_visitors, language)}</strong>
                  <small>+12.4% MoM</small>
                </div>
                <div className="metric-strip-item">
                  <span>{text.sessions}</span>
                  <strong>{formatNumber(data.total_sessions, language)}</strong>
                  <small>{data.pages_per_session} pages / session</small>
                </div>
                <div className="metric-strip-item">
                  <span>{text.bounceRate}</span>
                  <strong>{data.bounce_rate}%</strong>
                  <small>Industry standard: 45%</small>
                </div>
                <div className="metric-strip-item">
                  <span>{text.avgDuration}</span>
                  <strong className="value-positive">{data.avg_session_duration}</strong>
                  <small>Conversion: {data.conversion_rate}%</small>
                </div>
              </section>
            </ScrollReveal>

            {/* Content Grid: Channels + Devices */}
            <div className="calm-content-grid">
              {/* Traffic Channels */}
              <ScrollReveal className="calm-section calm-section--wide" delay={100}>
                <section>
                  <div className="calm-section-heading">
                    <div>
                      <p className="section-eyebrow">{text.channelsTitle}</p>
                      <h3>{text.channelsTitle}</h3>
                    </div>
                    <span>{data.channels?.length || 0} channels</span>
                  </div>
                  <div className="breakdown-list">
                    {(data.channels || []).map((row) => (
                      <button
                        type="button"
                        className="breakdown-row"
                        key={row.channel}
                        onClick={() => selectChannel(row)}
                      >
                        <span className="breakdown-label">
                          <strong>{row.channel}</strong>
                          <small>{formatNumber(row.sessions, language)} sessions</small>
                        </span>
                        <span className="breakdown-bar">
                          <i style={{ width: `${Math.max(4, row.share)}%` }} />
                        </span>
                        <strong>{row.share}%</strong>
                      </button>
                    ))}
                  </div>
                </section>
              </ScrollReveal>

              {/* Devices Split */}
              <ScrollReveal className="calm-section" delay={140}>
                <section>
                  <div className="calm-section-heading">
                    <div>
                      <p className="section-eyebrow">{text.devicesTitle}</p>
                      <h3>{text.devicesTitle}</h3>
                    </div>
                  </div>
                  <div className="client-type-list">
                    {(data.devices || []).map((dev) => (
                      <div className="client-type-row" key={dev.device}>
                        <span>
                          <strong>{dev.device}</strong>
                          <small>{formatNumber(dev.sessions, language)} sessions</small>
                        </span>
                        <i>
                          <b style={{ width: `${dev.share}%` }} />
                        </i>
                        <span className="client-type-value">
                          <strong>{dev.share}%</strong>
                        </span>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="text-link"
                    style={{ marginTop: "16px" }}
                    onClick={() => onNavigate?.("sales")}
                  >
                    {text.openSales} <ArrowUpRight size={14} />
                  </button>
                </section>
              </ScrollReveal>
            </div>

            {/* Bottom Grid: Top Pages & Geographic Traffic */}
            <div className="calm-content-grid" style={{ marginTop: "24px" }}>
              {/* Top Pages */}
              <ScrollReveal className="calm-section" delay={180}>
                <section>
                  <div className="calm-section-heading">
                    <div>
                      <p className="section-eyebrow">{text.pagesTitle}</p>
                      <h3>{text.pagesTitle}</h3>
                    </div>
                  </div>
                  <div className="product-list">
                    {(data.top_pages || []).map((page, index) => (
                      <div className="product-row" key={page.path}>
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        <div>
                          <strong>{page.title}</strong>
                          <small style={{ display: "block", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                            {page.path}
                          </small>
                        </div>
                        <small>{formatNumber(page.views, language)} {text.views.toLowerCase()}</small>
                      </div>
                    ))}
                  </div>
                </section>
              </ScrollReveal>

              {/* Geographic Traffic */}
              <ScrollReveal className="calm-section" delay={220}>
                <section>
                  <div className="calm-section-heading">
                    <div>
                      <p className="section-eyebrow">{text.geoTitle}</p>
                      <h3>{text.geoTitle}</h3>
                    </div>
                    <button type="button" className="text-link" onClick={() => onNavigate?.("wilayas")}>
                      Wilayas Map <ArrowUpRight size={14} />
                    </button>
                  </div>
                  <div className="geography-list">
                    {(data.geographic_traffic || []).map((geo) => (
                      <div className="geography-row" key={geo.wilaya}>
                        <span>{geo.wilaya}</span>
                        <i>
                          <b style={{ width: `${Math.max(4, geo.share * 2.5)}%` }} />
                        </i>
                        <strong>{formatNumber(geo.sessions, language)}</strong>
                      </div>
                    ))}
                  </div>
                </section>
              </ScrollReveal>
            </div>
          </>
        )}
      </AnalyticsState>
    </section>
  );
}

export default CustomerBehavior;
