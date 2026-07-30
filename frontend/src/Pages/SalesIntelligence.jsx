import ScrollReveal from "../components/common/ScrollReveal.jsx";

const translations = {
  en: {
    eyebrow: "Sales performance",
    title: "Sales Intelligence",
    description:
      "Track revenue, transaction volume, customer type, channels, growth, and unusual sales movements.",
    export: "Export sales report",

    totalRevenue: "Total revenue",
    totalRevenueNote: "Confirmed sales revenue",
    totalSales: "Total sales",
    totalSalesNote: "Completed transactions",
    averageBasket: "Average basket value",
    averageBasketNote: "Revenue per completed order",
    growthRate: "Sales growth rate",
    growthRateNote: "Compared with previous period",

    trendEyebrow: "Monthly performance",
    trendTitle: "Sales revenue trend",
    trendDescription: "Revenue generated during the last six months.",
    currentPeriod: "Current period",
    previousPeriod: "Previous period",

    clientMixEyebrow: "Customer mix",
    clientMixTitle: "B2B versus B2C sales",
    b2b: "B2B clients",
    b2c: "B2C clients",
    revenue: "Revenue",
    orders: "Orders",
    averageOrder: "Average order",

    channelsEyebrow: "Channel analysis",
    channelsTitle: "Sales by channel",
    channel: "Channel",
    share: "Share",
    transactions: "Transactions",
    change: "Change",

    anomaliesEyebrow: "Automatic detection",
    anomaliesTitle: "Sales observations",
    review: "Review",
    high: "High",
    medium: "Medium",
    information: "Information",

    websiteGrowth: "Website sales accelerated",
    websiteGrowthDescription:
      "Website revenue increased by 15.8% compared with the previous period.",

    b2bGrowth: "B2B revenue concentration",
    b2bGrowthDescription:
      "B2B clients generated 62.5% of total revenue from only 28.8% of transactions.",

    directDecline: "Direct channel decline",
    directDeclineDescription:
      "Direct and other sales decreased by 2.7% and should be reviewed.",

    mockData: "Demonstration data",
  },

  fr: {
    eyebrow: "Performance commerciale",
    title: "Intelligence des ventes",
    description:
      "Suivez le chiffre d’affaires, les transactions, les types de clients, les canaux, la croissance et les variations inhabituelles.",
    export: "Exporter le rapport",

    totalRevenue: "Chiffre d’affaires",
    totalRevenueNote: "Revenus des ventes confirmées",
    totalSales: "Nombre de ventes",
    totalSalesNote: "Transactions finalisées",
    averageBasket: "Panier moyen",
    averageBasketNote: "Revenu moyen par commande",
    growthRate: "Taux de croissance",
    growthRateNote: "Comparaison avec la période précédente",

    trendEyebrow: "Performance mensuelle",
    trendTitle: "Évolution du chiffre d’affaires",
    trendDescription: "Revenus générés durant les six derniers mois.",
    currentPeriod: "Période actuelle",
    previousPeriod: "Période précédente",

    clientMixEyebrow: "Répartition des clients",
    clientMixTitle: "Ventes B2B et B2C",
    b2b: "Clients B2B",
    b2c: "Clients B2C",
    revenue: "Revenu",
    orders: "Commandes",
    averageOrder: "Commande moyenne",

    channelsEyebrow: "Analyse des canaux",
    channelsTitle: "Ventes par canal",
    channel: "Canal",
    share: "Part",
    transactions: "Transactions",
    change: "Évolution",

    anomaliesEyebrow: "Détection automatique",
    anomaliesTitle: "Observations commerciales",
    review: "Examiner",
    high: "Élevée",
    medium: "Moyenne",
    information: "Information",

    websiteGrowth: "Accélération des ventes web",
    websiteGrowthDescription:
      "Le chiffre d’affaires du site web a augmenté de 15,8 % par rapport à la période précédente.",

    b2bGrowth: "Concentration du revenu B2B",
    b2bGrowthDescription:
      "Les clients B2B ont généré 62,5 % du revenu avec seulement 28,8 % des transactions.",

    directDecline: "Baisse du canal direct",
    directDeclineDescription:
      "Les ventes directes et autres ont diminué de 2,7 % et nécessitent une vérification.",

    mockData: "Données de démonstration",
  },
};

const monthlySales = [
  { month: { en: "Jan", fr: "Jan" }, revenue: 19.2 },
  { month: { en: "Feb", fr: "Fév" }, revenue: 20.8 },
  { month: { en: "Mar", fr: "Mar" }, revenue: 21.6 },
  { month: { en: "Apr", fr: "Avr" }, revenue: 24.1 },
  { month: { en: "May", fr: "Mai" }, revenue: 26.0 },
  { month: { en: "Jun", fr: "Juin" }, revenue: 30.3 },
];

const channelData = [
  {
    name: { en: "Website", fr: "Site web" },
    revenue: "61.8M DA",
    transactions: "7,240",
    share: 43.5,
    change: "+15.8%",
    positive: true,
  },
  {
    name: { en: "Sales team", fr: "Équipe commerciale" },
    revenue: "54.6M DA",
    transactions: "3,911",
    share: 38.5,
    change: "+8.1%",
    positive: true,
  },
  {
    name: { en: "Marketplace", fr: "Marketplace" },
    revenue: "18.2M DA",
    transactions: "4,096",
    share: 12.8,
    change: "+11.6%",
    positive: true,
  },
  {
    name: { en: "Direct and other", fr: "Direct et autres" },
    revenue: "7.4M DA",
    transactions: "1,140",
    share: 5.2,
    change: "-2.7%",
    positive: false,
  },
];

function SalesIntelligence({ language = "en" }) {
  const text = translations[language];

  const chartWidth = 760;
  const chartHeight = 220;
  const horizontalPadding = 30;
  const verticalPadding = 28;

  const values = monthlySales.map((item) => item.revenue);
  const minimumValue = Math.min(...values) - 2;
  const maximumValue = Math.max(...values) + 2;
  const valueRange = maximumValue - minimumValue;

  const chartPoints = monthlySales.map((item, index) => {
    const x =
      horizontalPadding +
      (index / (monthlySales.length - 1)) *
        (chartWidth - horizontalPadding * 2);

    const y =
      chartHeight -
      verticalPadding -
      ((item.revenue - minimumValue) / valueRange) *
        (chartHeight - verticalPadding * 2);

    return {
      ...item,
      x,
      y,
    };
  });

  const polylinePoints = chartPoints
    .map((point) => `${point.x},${point.y}`)
    .join(" ");

  const areaPoints = [
    `${horizontalPadding},${chartHeight - verticalPadding}`,
    polylinePoints,
    `${chartWidth - horizontalPadding},${chartHeight - verticalPadding}`,
  ].join(" ");

  const handleExport = () => {
    const rows = [
      [text.title],
      [],
      [text.totalRevenue, "142M DA"],
      [text.totalSales, "16,387"],
      [text.averageBasket, "8,665 DA"],
      [text.growthRate, "+12.4%"],
      [],
      [text.trendTitle],
      [text.channel, text.revenue],
      ...monthlySales.map((item) => [
        item.month[language],
        `${item.revenue}M DA`,
      ]),
      [],
      [text.channelsTitle],
      [
        text.channel,
        text.revenue,
        text.transactions,
        text.share,
        text.change,
      ],
      ...channelData.map((channel) => [
        channel.name[language],
        channel.revenue,
        channel.transactions,
        `${channel.share}%`,
        channel.change,
      ]),
    ];

    const escapeCell = (value) => {
      const stringValue = String(value ?? "");

      if (
        stringValue.includes(";") ||
        stringValue.includes('"') ||
        stringValue.includes("\n")
      ) {
        return `"${stringValue.replaceAll('"', '""')}"`;
      }

      return stringValue;
    };

    const csvContent = rows
      .map((row) => row.map(escapeCell).join(";"))
      .join("\n");

    const blob = new Blob([`\uFEFF${csvContent}`], {
      type: "text/csv;charset=utf-8;",
    });

    const downloadUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");

    downloadLink.href = downloadUrl;
    downloadLink.download = "energical-sales-report.csv";

    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    URL.revokeObjectURL(downloadUrl);
  };

  return (
    <section className="page-shell sales-page">
      <ScrollReveal>
        <div className="section-heading sales-page-heading">
          <div>
            <div className="sales-heading-meta">
              <p className="section-eyebrow">{text.eyebrow}</p>
              <span className="sales-demo-label">{text.mockData}</span>
            </div>

            <h2>{text.title}</h2>

            <p className="section-description">{text.description}</p>
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={handleExport}
          >
            {text.export}
          </button>
        </div>
      </ScrollReveal>

      <div className="sales-kpi-grid">
        <ScrollReveal className="sales-kpi-reveal" delay={40}>
          <article className="sales-kpi-card sales-kpi-card--featured">
            <div className="sales-kpi-topline">
              <span>{text.totalRevenue}</span>
              <span className="sales-kpi-indicator">+12.4%</span>
            </div>

            <strong className="sales-kpi-value">142M DA</strong>
            <p>{text.totalRevenueNote}</p>

            <div className="sales-kpi-progress">
              <span style={{ width: "78%" }} />
            </div>
          </article>
        </ScrollReveal>

        <ScrollReveal className="sales-kpi-reveal" delay={80}>
          <article className="sales-kpi-card">
            <div className="sales-kpi-topline">
              <span>{text.totalSales}</span>
              <span className="sales-kpi-index">01</span>
            </div>

            <strong className="sales-kpi-value">16,387</strong>
            <p>{text.totalSalesNote}</p>

            <div className="sales-kpi-footer">
              <span>B2B</span>
              <strong>4,720</strong>
              <span>B2C</span>
              <strong>11,667</strong>
            </div>
          </article>
        </ScrollReveal>

        <ScrollReveal className="sales-kpi-reveal" delay={120}>
          <article className="sales-kpi-card">
            <div className="sales-kpi-topline">
              <span>{text.averageBasket}</span>
              <span className="sales-kpi-index">02</span>
            </div>

            <strong className="sales-kpi-value">8,665 DA</strong>
            <p>{text.averageBasketNote}</p>

            <div className="sales-kpi-footer">
              <span>B2B</span>
              <strong>18,792 DA</strong>
              <span>B2C</span>
              <strong>4,568 DA</strong>
            </div>
          </article>
        </ScrollReveal>

        <ScrollReveal className="sales-kpi-reveal" delay={160}>
          <article className="sales-kpi-card">
            <div className="sales-kpi-topline">
              <span>{text.growthRate}</span>
              <span className="sales-kpi-indicator">Positive</span>
            </div>

            <strong className="sales-kpi-value sales-positive-value">
              +12.4%
            </strong>

            <p>{text.growthRateNote}</p>

            <div className="sales-growth-comparison">
              <div>
                <span>{text.currentPeriod}</span>
                <strong>142M DA</strong>
              </div>

              <div>
                <span>{text.previousPeriod}</span>
                <strong>126.3M DA</strong>
              </div>
            </div>
          </article>
        </ScrollReveal>
      </div>

      <div className="sales-analysis-grid">
        <ScrollReveal className="sales-panel-reveal" delay={80}>
          <article className="sales-panel sales-trend-panel">
            <div className="sales-panel-heading">
              <div>
                <p className="panel-eyebrow">{text.trendEyebrow}</p>
                <h3>{text.trendTitle}</h3>
                <p>{text.trendDescription}</p>
              </div>

              <div className="sales-period-summary">
                <span>{text.currentPeriod}</span>
                <strong>142M DA</strong>
              </div>
            </div>

            <div className="sales-chart-container">
              <svg
                className="sales-trend-chart"
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                role="img"
                aria-label={text.trendTitle}
              >
                <defs>
                  <linearGradient
                    id="salesAreaGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="#e8622c"
                      stopOpacity="0.22"
                    />
                    <stop
                      offset="100%"
                      stopColor="#e8622c"
                      stopOpacity="0"
                    />
                  </linearGradient>
                </defs>

                {[0, 1, 2, 3].map((line) => {
                  const y =
                    verticalPadding +
                    (line / 3) *
                      (chartHeight - verticalPadding * 2);

                  return (
                    <line
                      key={line}
                      className="sales-chart-grid-line"
                      x1={horizontalPadding}
                      x2={chartWidth - horizontalPadding}
                      y1={y}
                      y2={y}
                    />
                  );
                })}

                <polygon
                  className="sales-chart-area"
                  points={areaPoints}
                  fill="url(#salesAreaGradient)"
                />

                <polyline
                  className="sales-chart-line"
                  points={polylinePoints}
                />

                {chartPoints.map((point) => (
                  <g key={point.month.en}>
                    <circle
                      className="sales-chart-point"
                      cx={point.x}
                      cy={point.y}
                      r="5"
                    />

                    <text
                      className="sales-chart-value"
                      x={point.x}
                      y={point.y - 14}
                      textAnchor="middle"
                    >
                      {point.revenue}M
                    </text>
                  </g>
                ))}
              </svg>

              <div className="sales-chart-months">
                {monthlySales.map((item) => (
                  <span key={item.month.en}>
                    {item.month[language]}
                  </span>
                ))}
              </div>
            </div>
          </article>
        </ScrollReveal>

        <ScrollReveal className="sales-panel-reveal" delay={120}>
          <article className="sales-panel sales-client-mix-panel">
            <div className="sales-panel-heading">
              <div>
                <p className="panel-eyebrow">
                  {text.clientMixEyebrow}
                </p>
                <h3>{text.clientMixTitle}</h3>
              </div>
            </div>

            <div className="client-mix-total">
              <span>{text.revenue}</span>
              <strong>142M DA</strong>
            </div>

            <div
              className="client-mix-bar"
              aria-label="B2B 62.5%, B2C 37.5%"
            >
              <span className="client-mix-bar-b2b" />
              <span className="client-mix-bar-b2c" />
            </div>

            <div className="client-mix-legend">
              <article>
                <div className="client-mix-label">
                  <span className="client-mix-dot client-mix-dot--b2b" />
                  <strong>{text.b2b}</strong>
                </div>

                <strong className="client-mix-percentage">62.5%</strong>

                <dl>
                  <div>
                    <dt>{text.revenue}</dt>
                    <dd>88.7M DA</dd>
                  </div>

                  <div>
                    <dt>{text.orders}</dt>
                    <dd>4,720</dd>
                  </div>

                  <div>
                    <dt>{text.averageOrder}</dt>
                    <dd>18,792 DA</dd>
                  </div>
                </dl>
              </article>

              <article>
                <div className="client-mix-label">
                  <span className="client-mix-dot client-mix-dot--b2c" />
                  <strong>{text.b2c}</strong>
                </div>

                <strong className="client-mix-percentage">37.5%</strong>

                <dl>
                  <div>
                    <dt>{text.revenue}</dt>
                    <dd>53.3M DA</dd>
                  </div>

                  <div>
                    <dt>{text.orders}</dt>
                    <dd>11,667</dd>
                  </div>

                  <div>
                    <dt>{text.averageOrder}</dt>
                    <dd>4,568 DA</dd>
                  </div>
                </dl>
              </article>
            </div>
          </article>
        </ScrollReveal>
      </div>

      <div className="sales-lower-grid">
        <ScrollReveal className="sales-panel-reveal" delay={100}>
          <article className="sales-panel sales-channel-panel">
            <div className="sales-panel-heading">
              <div>
                <p className="panel-eyebrow">
                  {text.channelsEyebrow}
                </p>
                <h3>{text.channelsTitle}</h3>
              </div>
            </div>

            <div className="sales-table-wrapper">
              <table className="sales-channel-table">
                <thead>
                  <tr>
                    <th>{text.channel}</th>
                    <th>{text.revenue}</th>
                    <th>{text.transactions}</th>
                    <th>{text.share}</th>
                    <th>{text.change}</th>
                  </tr>
                </thead>

                <tbody>
                  {channelData.map((channel) => (
                    <tr key={channel.name.en}>
                      <td>
                        <div className="sales-channel-name">
                          <span>{channel.name[language]}</span>

                          <div className="sales-channel-progress">
                            <span
                              style={{
                                width: `${channel.share}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      <td>{channel.revenue}</td>
                      <td>{channel.transactions}</td>
                      <td>{channel.share}%</td>

                      <td>
                        <span
                          className={
                            channel.positive
                              ? "sales-change sales-change--positive"
                              : "sales-change sales-change--negative"
                          }
                        >
                          {channel.change}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </ScrollReveal>

        <ScrollReveal className="sales-panel-reveal" delay={140}>
          <article className="sales-panel sales-observations-panel">
            <div className="sales-panel-heading">
              <div>
                <p className="panel-eyebrow">
                  {text.anomaliesEyebrow}
                </p>
                <h3>{text.anomaliesTitle}</h3>
              </div>
            </div>

            <div className="sales-observation-list">
              <article className="sales-observation">
                <span className="sales-observation-marker sales-observation-marker--positive" />

                <div>
                  <div className="sales-observation-title">
                    <h4>{text.websiteGrowth}</h4>
                    <span>{text.information}</span>
                  </div>

                  <p>{text.websiteGrowthDescription}</p>
                </div>
              </article>

              <article className="sales-observation">
                <span className="sales-observation-marker sales-observation-marker--medium" />

                <div>
                  <div className="sales-observation-title">
                    <h4>{text.b2bGrowth}</h4>
                    <span>{text.medium}</span>
                  </div>

                  <p>{text.b2bGrowthDescription}</p>
                </div>
              </article>

              <article className="sales-observation">
                <span className="sales-observation-marker sales-observation-marker--high" />

                <div>
                  <div className="sales-observation-title">
                    <h4>{text.directDecline}</h4>
                    <span>{text.high}</span>
                  </div>

                  <p>{text.directDeclineDescription}</p>
                </div>
              </article>
            </div>

            <button type="button" className="sales-review-button">
              {text.review}
            </button>
          </article>
        </ScrollReveal>
      </div>
    </section>
  );
}

export default SalesIntelligence;