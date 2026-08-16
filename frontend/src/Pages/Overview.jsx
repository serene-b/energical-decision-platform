import { ArrowUpRight, BellRing, Package, ShoppingCart, TrendingUp, Users } from "lucide-react";
import { useState } from "react";

import { useAnalyticsResource, useRevenueTrendResource } from "../api/useApiResource.js";
import InteractiveRevenueTrend from "../components/Overview/InteractiveRevenueTrend.jsx";
import RevenueBubbleMap from "../components/Overview/RevenueBubbleMap.jsx";
import ScrollReveal from "../components/Common/ScrollReveal.jsx";
import { formatNumber } from "../utils/formatters.js";

const granularities = ["daily", "weekly", "monthly"];

const copy = {
  en: {
    eyebrow: "Executive snapshot",
    title: "Overview",
    description: "Realized performance, geographic concentration, and verified operational signals.",
    source: "Live business analytics",
    revenue: "Realized revenue",
    orders: "Realized orders",
    basket: "Average basket",
    clients: "Clients",
    previousMonth: "vs previous month",
    distinctOrders: "Distinct realized orders",
    basketDefinition: "Realized revenue / orders",
    viewClients: "View Client Intelligence",
    trend: "Revenue Trend",
    trendNote: "Explore PostgreSQL-backed realized order revenue by date.",
    viewSales: "View Sales Intelligence",
    granularity: "Granularity",
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
    startDate: "Start date",
    endDate: "End date",
    apply: "Apply",
    invalidRange: "Start date must be on or before end date.",
    outsideRange: "Choose dates within the available database range.",
    dataThrough: "Data through",
    selectedRange: "Selected range",
    partial: "Current partial period",
    map: "Revenue by Wilaya",
    mapNote: "Proportional bubbles show realized revenue for verified Algerian wilayas only.",
    viewWilayas: "View Wilaya Intelligence",
    product: "Top Product",
    productNote: "Realized product revenue from transaction line totals.",
    productRevenue: "Revenue",
    units: "Units",
    viewProducts: "View Products & Forecast",
    alerts: "Latest Alerts",
    alertsNote: "Verified business alerts only",
    viewAlerts: "View all alerts",
    noAlerts: "No verified business alerts are currently available.",
    unavailable: "Unavailable for the current database state.",
    retry: "Retry",
    loading: "Loading",
    mapUnavailable: "No realized revenue has valid supported Wilaya coordinates.",
  },
  fr: {
    startDate: "Date de debut",
    endDate: "Date de fin",
    invalidRange: "La date de debut doit preceder ou suivre la date de fin.",
    outsideRange: "Choisissez des dates dans la periode disponible de la base.",
    eyebrow: "Synthèse exécutive",
    title: "Vue d’ensemble",
    description: "Performance réalisée, concentration géographique et signaux opérationnels vérifiés.",
    source: "Analytique métier en direct",
    revenue: "Chiffre d’affaires réalisé",
    orders: "Commandes réalisées",
    basket: "Panier moyen",
    clients: "Clients",
    previousMonth: "vs mois précédent",
    distinctOrders: "Commandes réalisées distinctes",
    basketDefinition: "Chiffre d’affaires réalisé / commandes",
    viewClients: "Voir l’intelligence clients",
    trend: "Évolution du chiffre d’affaires",
    trendNote: "Explorez le revenu réalisé des commandes PostgreSQL par date.",
    viewSales: "Voir l’intelligence ventes",
    granularity: "Granularité",
    daily: "Jour",
    weekly: "Semaine",
    monthly: "Mois",
    apply: "Appliquer",
    dataThrough: "Données au",
    selectedRange: "Période sélectionnée",
    partial: "Période actuelle partielle",
    map: "Chiffre d’affaires par wilaya",
    mapNote: "Les bulles proportionnelles représentent le revenu réalisé des wilayas algériennes vérifiées.",
    viewWilayas: "Voir l’intelligence wilayas",
    product: "Produit phare",
    productNote: "Revenu produit réalisé calculé à partir des totaux de ligne.",
    productRevenue: "Revenu",
    units: "Unités",
    viewProducts: "Voir Produits & Prévisions",
    alerts: "Dernières alertes",
    alertsNote: "Alertes métier vérifiées uniquement",
    viewAlerts: "Voir toutes les alertes",
    noAlerts: "Aucune alerte métier vérifiée n’est actuellement disponible.",
    unavailable: "Indisponible pour l’état actuel de la base.",
    retry: "Réessayer",
    loading: "Chargement",
    mapUnavailable: "Aucun revenu réalisé ne possède de coordonnées de wilaya valides et prises en charge.",
  },
};

function money(value, language) {
  if (value === null || value === undefined || value === "") return "—";
  const locale = language === "fr" ? "fr-DZ" : "en-DZ";
  const number = Number(value || 0);
  if (Math.abs(number) >= 1_000_000) {
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(number / 1_000_000)}M DZD`;
  }
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(number)} DZD`;
}

function dateLabel(value, language) {
  if (!value) return "—";
  const date = new Date(`${value.length === 7 ? `${value}-01` : value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(language === "fr" ? "fr-DZ" : "en-DZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function MetricButton({ label, value, note, icon: Icon, primary = false, onClick }) {
  return (
    <button type="button" className={`overview-kpi${primary ? " overview-kpi--primary" : ""}`} onClick={onClick}>
      <span className="overview-kpi-label"><span>{label}</span><Icon size={15} aria-hidden="true" /></span>
      <strong>{value}</strong>
      <small>{note}</small>
    </button>
  );
}

function LoadingLines({ label }) {
  return (
    <div className="overview-skeleton" role="status" aria-label={label}>
      <span /><span /><span />
    </div>
  );
}

function ResourceState({ resource, text, children, emptyMessage = null }) {
  if (resource.isLoading && !resource.data) return <LoadingLines label={text.loading} />;
  if (resource.error && !resource.data) {
    return (
      <div className="overview-optional-state" role="alert">
        <span>{text.unavailable}</span>
        <button type="button" onClick={resource.retry}>{text.retry}</button>
      </div>
    );
  }
  if (!resource.data) return <div className="overview-optional-state">{emptyMessage || text.unavailable}</div>;
  return children;
}

function Overview({ language = "en", onNavigate }) {
  const text = copy[language] || copy.en;
  const overviewResource = useAnalyticsResource("overview");
  const wilayaResource = useAnalyticsResource("wilayas");
  const productResource = useAnalyticsResource("overviewProduct");
  const alertsResource = useAnalyticsResource("overviewAlerts");
  const [granularity, setGranularity] = useState("monthly");
  const [dateDraft, setDateDraft] = useState({ start: null, end: null });
  const [appliedRange, setAppliedRange] = useState({ start: "", end: "" });
  const [dateRangeError, setDateRangeError] = useState("");
  const trendResource = useRevenueTrendResource({
    granularity,
    startDate: appliedRange.start,
    endDate: appliedRange.end,
  });

  const validWilayas = (wilayaResource.data?.wilayas || []).filter((wilaya) => (
    wilaya.geography_status === "valid_wilaya"
    && Number.isFinite(Number(wilaya.latitude))
    && Number.isFinite(Number(wilaya.longitude))
    && Number.isFinite(Number(wilaya.revenue))
    && Number(wilaya.revenue) >= 0
  ));
  const topProduct = productResource.data?.top_product;
  const latestAlerts = (alertsResource.data?.alerts || []).slice(0, 3);

  const applyDateRange = (event) => {
    event.preventDefault();
    const availableStart = trendResource.data?.available_start || "";
    const availableEnd = trendResource.data?.available_end || "";
    const start = dateDraft.start ?? availableStart;
    const end = dateDraft.end ?? availableEnd;
    if (!start || !end) {
      setDateRangeError(text.outsideRange);
      return;
    }
    if (start > end) {
      setDateRangeError(text.invalidRange);
      return;
    }
    if ((availableStart && start < availableStart) || (availableEnd && end > availableEnd)) {
      setDateRangeError(text.outsideRange);
      return;
    }
    setDateRangeError("");
    setAppliedRange({ start, end });
  };

  const navigateToWilaya = (id, label, metrics) => {
    onNavigate?.("wilayas", {
      page: "wilayas",
      selection_type: "wilaya",
      selection: label,
      selection_label: label,
      approved_metrics: {
        wilaya_code: id,
        realized_revenue: metrics.revenue,
        realized_orders: metrics.orders,
        clients: metrics.clients,
      },
    });
  };

  return (
    <section className="page-shell calm-page overview-executive-page">
      <ScrollReveal>
        <header className="calm-page-header overview-executive-header">
          <div>
            <p className="section-eyebrow">{text.eyebrow}</p>
            <h2>{text.title}</h2>
            <p>{text.description}</p>
          </div>
          <span className="data-source-badge"><i aria-hidden="true" />{text.source}</span>
        </header>
      </ScrollReveal>

      <ScrollReveal delay={50}>
        <ResourceState resource={overviewResource} text={text}>
          {overviewResource.data && (
            <section className="overview-kpi-grid" aria-label={text.eyebrow}>
              <MetricButton
                label={text.revenue}
                value={money(overviewResource.data.revenue, language)}
                note={overviewResource.data.growth_pct == null ? "—" : `${overviewResource.data.growth_pct >= 0 ? "+" : ""}${overviewResource.data.growth_pct}% ${text.previousMonth}`}
                icon={TrendingUp}
                primary
                onClick={() => onNavigate?.("sales")}
              />
              <MetricButton
                label={text.orders}
                value={formatNumber(overviewResource.data.orders, language)}
                note={text.distinctOrders}
                icon={ShoppingCart}
                onClick={() => onNavigate?.("sales")}
              />
              <MetricButton
                label={text.basket}
                value={money(overviewResource.data.average_basket, language)}
                note={text.basketDefinition}
                icon={ShoppingCart}
                onClick={() => onNavigate?.("sales")}
              />
              <MetricButton
                label={text.clients}
                value={formatNumber(overviewResource.data.clients, language)}
                note={text.viewClients}
                icon={Users}
                onClick={() => onNavigate?.("clients")}
              />
            </section>
          )}
        </ResourceState>
      </ScrollReveal>

      <ScrollReveal delay={90}>
        <section className="overview-panel overview-trend-panel" aria-labelledby="overview-trend-title">
          <div className="overview-panel-heading">
            <div>
              <p className="section-eyebrow">{text.trend}</p>
              <h3 id="overview-trend-title">{text.trend}</h3>
              <p>{text.trendNote}</p>
            </div>
            <button type="button" className="text-link" onClick={() => onNavigate?.("sales")}>
              {text.viewSales} <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="overview-trend-filters">
            <fieldset className="overview-filter-group">
              <legend>{text.granularity}</legend>
              <div className="overview-granularity-control">
                {granularities.map((item) => (
                  <button key={item} type="button" className={granularity === item ? "is-active" : ""} aria-pressed={granularity === item} onClick={() => setGranularity(item)}>
                    {text[item]}
                  </button>
                ))}
              </div>
            </fieldset>
            <form className="overview-custom-range" onSubmit={applyDateRange}>
              <label>
                <span>{text.startDate}</span>
                <input
                  type="date"
                  value={dateDraft.start ?? trendResource.data?.available_start ?? ""}
                  min={trendResource.data?.available_start || undefined}
                  max={dateDraft.end || trendResource.data?.available_end || undefined}
                  onChange={(event) => setDateDraft((current) => ({ ...current, start: event.target.value }))}
                  required
                />
              </label>
              <label>
                <span>{text.endDate}</span>
                <input
                  type="date"
                  value={dateDraft.end ?? trendResource.data?.available_end ?? ""}
                  min={dateDraft.start || trendResource.data?.available_start || undefined}
                  max={trendResource.data?.available_end || undefined}
                  onChange={(event) => setDateDraft((current) => ({ ...current, end: event.target.value }))}
                  required
                />
              </label>
              <button type="submit">{text.apply}</button>
            </form>
            {dateRangeError && <p className="overview-filter-error" role="alert">{dateRangeError}</p>}
          </div>

          {trendResource.data && (
            <div className="overview-trend-context" aria-live="polite">
              <span>{text.selectedRange}: <strong>{dateLabel(trendResource.data.range_start, language)} – {dateLabel(trendResource.data.range_end, language)}</strong></span>
              <span>{text.dataThrough}: <strong>{dateLabel(trendResource.data.data_through, language)}</strong></span>
              {trendResource.data.partial_periods?.length > 0 && <em>{text.partial}</em>}
            </div>
          )}
          <InteractiveRevenueTrend
            key={`${granularity}-${appliedRange.start}-${appliedRange.end}-${trendResource.response?.generated_at || "pending"}-${trendResource.data?.trend?.length || 0}`}
            resource={trendResource}
            language={language}
          />
        </section>
      </ScrollReveal>

      <ScrollReveal delay={130}>
        <section className="overview-panel overview-map-panel" aria-labelledby="overview-map-title">
          <div className="overview-panel-heading">
            <div>
              <p className="section-eyebrow">{text.map}</p>
              <h3 id="overview-map-title">{text.map}</h3>
              <p>{text.mapNote}</p>
            </div>
            <button type="button" className="text-link" onClick={() => onNavigate?.("wilayas")}>
              {text.viewWilayas} <ArrowUpRight size={14} />
            </button>
          </div>
          <ResourceState resource={wilayaResource} text={text} emptyMessage={text.mapUnavailable}>
            {validWilayas.length ? (
              <RevenueBubbleMap
                wilayas={validWilayas}
                language={language}
                onSelect={navigateToWilaya}
                onOpen={() => onNavigate?.("wilayas")}
              />
            ) : <div className="overview-optional-state">{text.mapUnavailable}</div>}
          </ResourceState>
        </section>
      </ScrollReveal>

      <div className="overview-lower-grid">
        <ScrollReveal delay={170}>
          <section className="overview-panel overview-product-panel" aria-labelledby="overview-product-title">
            <div className="overview-panel-heading">
              <div>
                <p className="section-eyebrow">{text.product}</p>
                <h3 id="overview-product-title">{text.product}</h3>
                <p>{text.productNote}</p>
              </div>
              <Package size={18} aria-hidden="true" />
            </div>
            <ResourceState resource={productResource} text={text}>
              {topProduct ? (
                <>
                  <button type="button" className="overview-product-card" onClick={() => onNavigate?.("products")}>
                    <span className="overview-product-icon"><Package size={19} aria-hidden="true" /></span>
                    <span className="overview-product-main"><strong>{topProduct.label}</strong><small>{text.productRevenue}</small></span>
                    <span className="overview-product-value"><strong>{money(topProduct.revenue, language)}</strong><ArrowUpRight size={15} aria-hidden="true" /></span>
                  </button>
                  <dl className="overview-product-meta">
                    <div><dt>{text.orders}</dt><dd>{formatNumber(topProduct.orders, language)}</dd></div>
                    <div><dt>{text.units}</dt><dd>{formatNumber(topProduct.units, language)}</dd></div>
                  </dl>
                </>
              ) : <div className="overview-optional-state">{text.unavailable}</div>}
            </ResourceState>
            <button type="button" className="text-link overview-panel-link" onClick={() => onNavigate?.("products")}>
              {text.viewProducts} <ArrowUpRight size={14} />
            </button>
          </section>
        </ScrollReveal>

        <ScrollReveal delay={210}>
          <section className="overview-panel overview-alerts-panel" aria-labelledby="overview-alerts-title">
            <div className="overview-panel-heading">
              <div>
                <p className="section-eyebrow">{text.alerts}</p>
                <h3 id="overview-alerts-title">{text.alerts}</h3>
                <p>{text.alertsNote}</p>
              </div>
              <BellRing size={18} aria-hidden="true" />
            </div>
            <ResourceState resource={alertsResource} text={text}>
              {latestAlerts.length ? (
                <ul className="overview-alert-list">
                  {latestAlerts.map((alert) => (
                    <li key={`${alert.code}-${alert.observed_at}`}>
                      <button type="button" className="overview-alert-item" onClick={() => onNavigate?.("alerts")}>
                        <span className={`overview-alert-dot overview-alert-dot--${alert.severity || "info"}`} aria-hidden="true" />
                        <span><strong>{alert.title}</strong><small>{alert.message}</small><small>{dateLabel(alert.observed_at?.slice(0, 10), language)}</small></span>
                        <em>{formatNumber(alert.value, language)} {alert.unit}</em>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : <div className="overview-optional-state overview-optional-state--muted">{text.noAlerts}</div>}
            </ResourceState>
            <button type="button" className="text-link overview-panel-link" onClick={() => onNavigate?.("alerts")}>
              {text.viewAlerts} <ArrowUpRight size={14} />
            </button>
          </section>
        </ScrollReveal>
      </div>
    </section>
  );
}

export default Overview;
