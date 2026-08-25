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
    eyebrow: "Executive Dashboard",
    title: "Overview",
    description: "Real-time sales velocity, regional concentration, and verified commercial alerts.",
    source: "Live Business Data",
    revenue: "Total Revenue",
    orders: "Total Orders",
    basket: "Average Order Value",
    clients: "Active Clients",
    previousMonth: "vs previous month",
    distinctOrders: "Completed orders",
    basketDefinition: "Revenue per order",
    viewClients: "Explore Client Intelligence",
    trend: "Revenue Performance",
    trendNote: "Historical gross sales and revenue velocity by date.",
    viewSales: "View Sales Intelligence",
    granularity: "Timeframe",
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
    startDate: "Start date",
    endDate: "End date",
    apply: "Apply Range",
    invalidRange: "Start date must be before or equal to end date.",
    outsideRange: "Selected dates exceed available database records.",
    dataThrough: "Data as of",
    selectedRange: "Selected period",
    partial: "Month to date",
    map: "Regional Distribution",
    mapNote: "Turnover concentration across Algerian wilayas.",
    viewWilayas: "View Wilaya Intelligence",
    product: "Best Selling SKU",
    productNote: "Top performing product by sales volume and turnover.",
    productRevenue: "Revenue",
    units: "Units Sold",
    viewProducts: "View Products & Forecast",
    alerts: "Operational Alerts",
    alertsNote: "Priority risk signals and data health",
    viewAlerts: "View all alerts",
    noAlerts: "All operational metrics are within healthy thresholds.",
    unavailable: "Data unavailable for the current selection.",
    retry: "Refresh",
    loading: "Loading metrics…",
    mapUnavailable: "No regional data points available for the selected filters.",
  },
  fr: {
    startDate: "Date de début",
    endDate: "Date de fin",
    invalidRange: "La date de début doit être antérieure à la date de fin.",
    outsideRange: "Les dates sélectionnées dépassent la plage disponible en base.",
    eyebrow: "Tableau de bord exécutif",
    title: "Vue d’ensemble",
    description: "Suivi des ventes en direct, concentration régionale et alertes commerciales vérifiées.",
    source: "Données Métier en Direct",
    revenue: "Chiffre d’Affaires",
    orders: "Total Commandes",
    basket: "Panier Moyen",
    clients: "Clients Actifs",
    previousMonth: "vs mois précédent",
    distinctOrders: "Commandes finalisées",
    basketDefinition: "Revenu par commande",
    viewClients: "Explorer l’Intelligence Clients",
    trend: "Évolution du Chiffre d’Affaires",
    trendNote: "Chiffre d'affaires historique et volume des ventes par date.",
    viewSales: "Voir l’intelligence ventes",
    granularity: "Période",
    daily: "Jour",
    weekly: "Semaine",
    monthly: "Mois",
    apply: "Appliquer",
    dataThrough: "Données au",
    selectedRange: "Période sélectionnée",
    partial: "Mois en cours",
    map: "Répartition Régionale",
    mapNote: "Concentration des ventes par wilaya en Algérie.",
    viewWilayas: "Voir l’intelligence wilayas",
    product: "Produit Phare",
    productNote: "Produit leader par volume de vente et chiffre d'affaires.",
    productRevenue: "Revenu",
    units: "Unités Vendues",
    viewProducts: "Voir produits & prévisions",
    alerts: "Alertes Opérationnelles",
    alertsNote: "Signaux prioritaires et qualité des données",
    viewAlerts: "Voir toutes les alertes",
    noAlerts: "Tous les indicateurs opérationnels sont au vert.",
    unavailable: "Données indisponibles pour la sélection actuelle.",
    retry: "Actualiser",
    loading: "Chargement…",
    mapUnavailable: "Aucune donnée régionale disponible pour les filtres sélectionnés.",
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
