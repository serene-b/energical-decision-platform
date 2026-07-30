import KpiCard from "../components/common/KpiCard.jsx";
import ScrollReveal from "../components/common/ScrollReveal.jsx";

import {
  overviewAlerts,
  overviewKpis,
  revenueSeries,
} from "../data/mockData.js";

const overviewTranslations = {
  en: {
    eyebrow: "Executive snapshot",
    title: "Business performance at a glance",
    description:
      "A consolidated view of revenue, customer risk, sales activity, and the three-month revenue forecast.",

    export: "Export summary",

    salesPerformance: "Sales performance",
    revenueTrend: "Revenue Trend",
    totalPeriodRevenue: "Total period revenue",
    periodChange: "Period change",
    lastSixMonths: "Last 6 months",

    decisionSupport: "Decision support",
    latestAlerts: "Latest Alerts",
    viewAll: "View all",

    metric: "Metric",
    value: "Value",
    details: "Details",
  },

  fr: {
    eyebrow: "Synthèse exécutive",
    title: "Performance commerciale en un coup d’œil",
    description:
      "Une vue consolidée du chiffre d’affaires, des risques clients, des ventes et des prévisions de revenus à trois mois.",

    export: "Exporter le résumé",

    salesPerformance: "Performance des ventes",
    revenueTrend: "Évolution du chiffre d’affaires",
    totalPeriodRevenue: "Chiffre d’affaires de la période",
    periodChange: "Évolution de la période",
    lastSixMonths: "6 derniers mois",

    decisionSupport: "Aide à la décision",
    latestAlerts: "Dernières alertes",
    viewAll: "Voir tout",

    metric: "Indicateur",
    value: "Valeur",
    details: "Détails",
  },
};

function Overview({ language = "en" }) {
  const text =
    overviewTranslations[language] ||
    overviewTranslations.en;

  /*
   * Temporary chart dimensions.
   * These values are only used to draw the SVG chart.
   */
  const chartWidth = 700;
  const chartHeight = 220;
  const chartPadding = 30;

  const revenueValues = revenueSeries.map(
    (item) => item.value
  );

  const maximumRevenue = Math.max(...revenueValues);

  /*
   * Converts the revenue data into SVG coordinates.
   */
  const chartPoints = revenueSeries.map(
    (item, index) => {
      const availableWidth =
        chartWidth - chartPadding * 2;

      const availableHeight =
        chartHeight - chartPadding * 2;

      const x =
        chartPadding +
        (index * availableWidth) /
          (revenueSeries.length - 1);

      const y =
        chartHeight -
        chartPadding -
        (item.value / maximumRevenue) *
          availableHeight;

      return {
        x,
        y,
      };
    }
  );

  const polylinePoints = chartPoints
    .map((point) => `${point.x},${point.y}`)
    .join(" ");

  /*
   * Downloads the Overview KPI data as a CSV file.
   */
  const exportOverviewCsv = () => {
    const headers = [
      text.metric,
      text.value,
      text.details,
    ];

    const rows = overviewKpis.map((kpi) => [
      kpi.title[language],
      kpi.value,
      `${kpi.description[language]} — ${kpi.trend[language]}`,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => {
            const safeCell = String(cell).replace(
              /"/g,
              '""'
            );

            return `"${safeCell}"`;
          })
          .join(",")
      )
      .join("\n");

    const csvBlob = new Blob(
      ["\uFEFF" + csvContent],
      {
        type: "text/csv;charset=utf-8;",
      }
    );

    const fileUrl =
      URL.createObjectURL(csvBlob);

    const downloadLink =
      document.createElement("a");

    const currentDate = new Date()
      .toISOString()
      .split("T")[0];

    downloadLink.href = fileUrl;
    downloadLink.download =
      `energical-overview-${currentDate}.csv`;

    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();

    URL.revokeObjectURL(fileUrl);
  };

  return (
    <section className="overview-page">
      {/* PAGE INTRODUCTION */}

      <ScrollReveal>
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">
              {text.eyebrow}
            </p>

            <h2>{text.title}</h2>

            <p className="section-description">
              {text.description}
            </p>
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={exportOverviewCsv}
          >
            {text.export}
          </button>
        </div>
      </ScrollReveal>

      {/* KPI CARDS */}

      <div className="kpi-grid">
        {overviewKpis.map((kpi, index) => (
          <ScrollReveal
            key={kpi.id}
            delay={index * 70}
            className="kpi-reveal"
          >
            <KpiCard
              title={kpi.title[language]}
              value={kpi.value}
              description={
                kpi.description[language]
              }
              trend={kpi.trend[language]}
              icon={kpi.icon}
              accent={kpi.accent}
            />
          </ScrollReveal>
        ))}
      </div>

      {/* REVENUE TREND AND ALERTS */}

      <div className="dashboard-grid">
        {/* REVENUE TREND PANEL */}

        <ScrollReveal className="panel-reveal">
          <article className="dashboard-panel revenue-panel">
            <div className="panel-heading">
              <div>
                <p className="panel-eyebrow">
                  {text.salesPerformance}
                </p>

                <h3>{text.revenueTrend}</h3>
              </div>

              <select
                className="period-select"
                defaultValue="six-months"
                aria-label={text.lastSixMonths}
              >
                <option value="six-months">
                  {text.lastSixMonths}
                </option>
              </select>
            </div>

            <div className="revenue-summary">
              <div>
                <span>
                  {text.totalPeriodRevenue}
                </span>

                <strong>68.2M DA</strong>
              </div>

              <div className="revenue-change">
                <span>
                  {text.periodChange}
                </span>

                <strong>+8.4%</strong>
              </div>
            </div>

            <div className="chart-wrapper">
              <svg
                className="trend-chart"
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                preserveAspectRatio="none"
                role="img"
                aria-label={text.revenueTrend}
              >
                {/* Horizontal grid lines */}

                <g className="chart-grid">
                  <line
                    x1="30"
                    y1="40"
                    x2="670"
                    y2="40"
                  />

                  <line
                    x1="30"
                    y1="85"
                    x2="670"
                    y2="85"
                  />

                  <line
                    x1="30"
                    y1="130"
                    x2="670"
                    y2="130"
                  />

                  <line
                    x1="30"
                    y1="175"
                    x2="670"
                    y2="175"
                  />
                </g>

                {/* Revenue line */}

                <polyline
                  className="chart-line"
                  points={polylinePoints}
                />

                {/* Revenue points */}

                {chartPoints.map(
                  (point, index) => (
                    <circle
                      key={
                        revenueSeries[index]
                          .month.en
                      }
                      className="chart-point"
                      cx={point.x}
                      cy={point.y}
                      r="5"
                    />
                  )
                )}
              </svg>

              <div className="chart-labels">
                {revenueSeries.map((item) => (
                  <span key={item.month.en}>
                    {item.month[language]}
                  </span>
                ))}
              </div>
            </div>
          </article>
        </ScrollReveal>

        {/* LATEST ALERTS PANEL */}

        <ScrollReveal
          className="panel-reveal"
          delay={100}
        >
          <article className="dashboard-panel alerts-panel">
            <div className="panel-heading">
              <div>
                <p className="panel-eyebrow">
                  {text.decisionSupport}
                </p>

                <h3>{text.latestAlerts}</h3>
              </div>

              <button
                type="button"
                className="text-button"
              >
                {text.viewAll}
              </button>
            </div>

            <ul className="alert-list">
              {overviewAlerts.map((alert) => (
                <li
                  className="alert-item"
                  key={alert.id}
                >
                  <span
                    className={`alert-marker ${
                      alert.priority
                        ? "priority"
                        : ""
                    }`}
                  />

                  <div className="alert-content">
                    <div className="alert-title-row">
                      <h4>
                        {
                          alert.title[
                            language
                          ]
                        }
                      </h4>

                      <span>
                        {
                          alert.status[
                            language
                          ]
                        }
                      </span>
                    </div>

                    <p>
                      {
                        alert.description[
                          language
                        ]
                      }
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </article>
        </ScrollReveal>
      </div>
    </section>
  );
}

export default Overview;