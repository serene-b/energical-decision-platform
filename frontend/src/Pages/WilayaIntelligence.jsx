import { useState } from "react";
import ScrollReveal from "../components/common/ScrollReveal.jsx";

const translations = {
  en: {
    eyebrow: "Regional performance",
    title: "Wilaya Intelligence",
    description:
      "Compare revenue, clients, transaction activity, growth, and commercial risk across Algerian wilayas.",
    export: "Export wilaya report",
    demo: "Demonstration data",

    activeWilayas: "Active wilayas",
    activeWilayasNote: "Wilayas with recorded transactions",
    topWilaya: "Top-performing wilaya",
    topWilayaNote: "Highest revenue contribution",
    fastestGrowth: "Fastest growth",
    fastestGrowthNote: "Strongest period-over-period increase",
    riskWilayas: "High-risk wilayas",
    riskWilayasNote: "Require commercial attention",

    ranking: "Regional ranking",
    rankingDescription:
      "Select a wilaya to inspect its commercial diagnosis.",
    diagnosis: "Wilaya diagnosis",
    revenue: "Revenue",
    clients: "Clients",
    orders: "Orders",
    growth: "Growth",
    marketShare: "Market share",
    risk: "Risk",
    opportunity: "Recommended opportunity",

    coverage: "Regional coverage",
    coverageDescription:
      "Revenue intensity across the most active wilayas.",

    table: "Wilaya performance table",
    tableDescription:
      "Detailed comparison of sales and client activity.",
    wilaya: "Wilaya",
    status: "Status",
    low: "Low",
    medium: "Medium",
    high: "High",
  },

  fr: {
    eyebrow: "Performance régionale",
    title: "Intelligence des wilayas",
    description:
      "Comparez le chiffre d’affaires, les clients, les transactions, la croissance et le risque commercial par wilaya.",
    export: "Exporter le rapport",
    demo: "Données de démonstration",

    activeWilayas: "Wilayas actives",
    activeWilayasNote: "Wilayas ayant enregistré des transactions",
    topWilaya: "Wilaya la plus performante",
    topWilayaNote: "Contribution la plus élevée au revenu",
    fastestGrowth: "Croissance la plus rapide",
    fastestGrowthNote: "Plus forte progression entre les périodes",
    riskWilayas: "Wilayas à risque élevé",
    riskWilayasNote: "Nécessitent une attention commerciale",

    ranking: "Classement régional",
    rankingDescription:
      "Sélectionnez une wilaya pour consulter son diagnostic.",
    diagnosis: "Diagnostic de la wilaya",
    revenue: "Revenu",
    clients: "Clients",
    orders: "Commandes",
    growth: "Croissance",
    marketShare: "Part de marché",
    risk: "Risque",
    opportunity: "Opportunité recommandée",

    coverage: "Couverture régionale",
    coverageDescription:
      "Intensité du chiffre d’affaires dans les wilayas les plus actives.",

    table: "Tableau des performances",
    tableDescription:
      "Comparaison détaillée des ventes et de l’activité client.",
    wilaya: "Wilaya",
    status: "Statut",
    low: "Faible",
    medium: "Moyen",
    high: "Élevé",
  },
};

const wilayas = [
  {
    id: "16",
    name: "Alger",
    revenue: 31.8,
    clients: 932,
    orders: 3648,
    growth: 14.2,
    share: 22.4,
    risk: "low",
    opportunity: {
      en: "Increase B2B account development and premium-product campaigns.",
      fr: "Renforcer le développement B2B et les campagnes de produits premium.",
    },
  },
  {
    id: "31",
    name: "Oran",
    revenue: 18.4,
    clients: 521,
    orders: 2210,
    growth: 9.7,
    share: 13.0,
    risk: "low",
    opportunity: {
      en: "Expand recurring B2B offers and improve repeat-purchase campaigns.",
      fr: "Développer les offres B2B récurrentes et les campagnes de réachat.",
    },
  },
  {
    id: "19",
    name: "Sétif",
    revenue: 13.1,
    clients: 378,
    orders: 1570,
    growth: 18.2,
    share: 9.2,
    risk: "low",
    opportunity: {
      en: "Prioritize stock availability to support accelerating demand.",
      fr: "Prioriser la disponibilité du stock pour soutenir la demande croissante.",
    },
  },
  {
    id: "09",
    name: "Blida",
    revenue: 11.6,
    clients: 341,
    orders: 1448,
    growth: 11.1,
    share: 8.2,
    risk: "medium",
    opportunity: {
      en: "Recover inactive clients and strengthen local digital acquisition.",
      fr: "Réactiver les clients inactifs et renforcer l’acquisition digitale locale.",
    },
  },
  {
    id: "25",
    name: "Constantine",
    revenue: 10.9,
    clients: 319,
    orders: 1291,
    growth: 6.3,
    share: 7.7,
    risk: "medium",
    opportunity: {
      en: "Improve retention among medium-value client accounts.",
      fr: "Améliorer la fidélisation des comptes clients à valeur moyenne.",
    },
  },
  {
    id: "15",
    name: "Tizi Ouzou",
    revenue: 8.7,
    clients: 286,
    orders: 1087,
    growth: 4.1,
    share: 6.1,
    risk: "medium",
    opportunity: {
      en: "Use targeted product bundles to increase average order value.",
      fr: "Utiliser des offres groupées pour augmenter le panier moyen.",
    },
  },
  {
    id: "06",
    name: "Béjaïa",
    revenue: 7.9,
    clients: 241,
    orders: 934,
    growth: -2.8,
    share: 5.6,
    risk: "high",
    opportunity: {
      en: "Investigate the revenue decline and contact high-value inactive clients.",
      fr: "Analyser la baisse du revenu et contacter les clients inactifs à forte valeur.",
    },
  },
  {
    id: "23",
    name: "Annaba",
    revenue: 7.2,
    clients: 218,
    orders: 861,
    growth: -4.5,
    share: 5.1,
    risk: "high",
    opportunity: {
      en: "Review regional pricing, delivery performance, and stock availability.",
      fr: "Examiner les prix, la livraison et la disponibilité du stock dans la région.",
    },
  },
];

function WilayaIntelligence({ language = "en" }) {
  const text = translations[language];
  const [selectedWilayaId, setSelectedWilayaId] = useState("16");

  const selectedWilaya =
    wilayas.find((wilaya) => wilaya.id === selectedWilayaId) ||
    wilayas[0];

  const riskLabels = {
    low: text.low,
    medium: text.medium,
    high: text.high,
  };

  const handleExport = () => {
    const rows = [
      [
        text.wilaya,
        text.revenue,
        text.clients,
        text.orders,
        text.growth,
        text.marketShare,
        text.risk,
      ],
      ...wilayas.map((wilaya) => [
        wilaya.name,
        `${wilaya.revenue}M DA`,
        wilaya.clients,
        wilaya.orders,
        `${wilaya.growth}%`,
        `${wilaya.share}%`,
        riskLabels[wilaya.risk],
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(";"),
      )
      .join("\n");

    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "energical-wilaya-intelligence.csv";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  return (
    <section className="page-shell di-page">
      <ScrollReveal>
        <div className="di-hero">
          <div>
            <div className="di-heading-meta">
              <p className="section-eyebrow">{text.eyebrow}</p>
              <span className="di-demo-badge">{text.demo}</span>
            </div>

            <h2>{text.title}</h2>
            <p>{text.description}</p>
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

      <div className="di-kpi-grid">
        <ScrollReveal className="di-fill" delay={40}>
          <article className="di-kpi-card">
            <div className="di-kpi-top">
              <span>{text.activeWilayas}</span>
              <span className="di-kpi-index">01</span>
            </div>

            <strong className="di-kpi-value">43</strong>
            <p>{text.activeWilayasNote}</p>
          </article>
        </ScrollReveal>

        <ScrollReveal className="di-fill" delay={80}>
          <article className="di-kpi-card di-kpi-card--featured">
            <div className="di-kpi-top">
              <span>{text.topWilaya}</span>
              <span className="di-kpi-tag">22.4%</span>
            </div>

            <strong className="di-kpi-value">Alger</strong>
            <p>{text.topWilayaNote}</p>

            <div className="di-kpi-detail">
              <span>Revenue</span>
              <strong>31.8M DA</strong>
            </div>
          </article>
        </ScrollReveal>

        <ScrollReveal className="di-fill" delay={120}>
          <article className="di-kpi-card">
            <div className="di-kpi-top">
              <span>{text.fastestGrowth}</span>
              <span className="di-kpi-tag">+18.2%</span>
            </div>

            <strong className="di-kpi-value">Sétif</strong>
            <p>{text.fastestGrowthNote}</p>
          </article>
        </ScrollReveal>

        <ScrollReveal className="di-fill" delay={160}>
          <article className="di-kpi-card">
            <div className="di-kpi-top">
              <span>{text.riskWilayas}</span>
              <span className="di-kpi-index">04</span>
            </div>

            <strong className="di-kpi-value di-value-orange">
              5
            </strong>

            <p>{text.riskWilayasNote}</p>
          </article>
        </ScrollReveal>
      </div>

      <div className="di-grid wilaya-main-grid">
        <ScrollReveal className="di-fill" delay={80}>
          <article className="di-panel">
            <div className="di-panel-heading">
              <div>
                <p className="panel-eyebrow">{text.ranking}</p>
                <h3>{text.ranking}</h3>
                <p>{text.rankingDescription}</p>
              </div>
            </div>

            <div className="wilaya-ranking-list">
              {wilayas.map((wilaya, index) => (
                <button
                  type="button"
                  className={`wilaya-ranking-row ${
                    selectedWilayaId === wilaya.id
                      ? "is-selected"
                      : ""
                  }`}
                  key={wilaya.id}
                  onClick={() => setSelectedWilayaId(wilaya.id)}
                >
                  <span className="wilaya-rank-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <span className="wilaya-rank-name">
                    <strong>{wilaya.name}</strong>
                    <small>
                      {wilaya.clients} {text.clients.toLowerCase()}
                    </small>
                  </span>

                  <span className="wilaya-rank-bar">
                    <span
                      style={{
                        width: `${Math.min(
                          wilaya.share * 3.5,
                          100,
                        )}%`,
                      }}
                    />
                  </span>

                  <span className="wilaya-rank-value">
                    <strong>{wilaya.revenue}M DA</strong>
                    <small
                      className={
                        wilaya.growth >= 0
                          ? "di-positive"
                          : "di-negative"
                      }
                    >
                      {wilaya.growth >= 0 ? "+" : ""}
                      {wilaya.growth}%
                    </small>
                  </span>
                </button>
              ))}
            </div>
          </article>
        </ScrollReveal>

        <ScrollReveal className="di-fill" delay={120}>
          <article className="di-panel wilaya-diagnosis">
            <div className="di-panel-heading">
              <div>
                <p className="panel-eyebrow">{text.diagnosis}</p>
                <h3>{selectedWilaya.name}</h3>
              </div>

              <span
                className={`di-status di-status--risk-${selectedWilaya.risk}`}
              >
                {riskLabels[selectedWilaya.risk]} {text.risk}
              </span>
            </div>

            <div className="wilaya-diagnosis-value">
              <span>{text.revenue}</span>
              <strong>{selectedWilaya.revenue}M DA</strong>
              <small>{selectedWilaya.share}%</small>
            </div>

            <div className="wilaya-diagnosis-metrics">
              <div>
                <span>{text.clients}</span>
                <strong>{selectedWilaya.clients}</strong>
              </div>

              <div>
                <span>{text.orders}</span>
                <strong>{selectedWilaya.orders}</strong>
              </div>

              <div>
                <span>{text.growth}</span>
                <strong
                  className={
                    selectedWilaya.growth >= 0
                      ? "di-positive"
                      : "di-negative"
                  }
                >
                  {selectedWilaya.growth >= 0 ? "+" : ""}
                  {selectedWilaya.growth}%
                </strong>
              </div>
            </div>

            <div className="wilaya-opportunity">
              <span>{text.opportunity}</span>
              <p>{selectedWilaya.opportunity[language]}</p>
            </div>
          </article>
        </ScrollReveal>
      </div>

      <ScrollReveal delay={100}>
        <article className="di-panel">
          <div className="di-panel-heading">
            <div>
              <p className="panel-eyebrow">{text.coverage}</p>
              <h3>{text.coverage}</h3>
              <p>{text.coverageDescription}</p>
            </div>
          </div>

          <div className="wilaya-coverage-grid">
            {wilayas.map((wilaya) => (
              <button
                type="button"
                key={wilaya.id}
                className={`wilaya-coverage-tile ${
                  selectedWilayaId === wilaya.id
                    ? "is-selected"
                    : ""
                }`}
                onClick={() => setSelectedWilayaId(wilaya.id)}
                style={{
                  "--coverage-opacity": Math.min(
                    0.12 + wilaya.share / 40,
                    0.72,
                  ),
                }}
              >
                <span>{wilaya.id}</span>
                <strong>{wilaya.name}</strong>
                <small>{wilaya.revenue}M DA</small>
              </button>
            ))}
          </div>
        </article>
      </ScrollReveal>

      <ScrollReveal delay={120}>
        <article className="di-panel">
          <div className="di-panel-heading">
            <div>
              <p className="panel-eyebrow">{text.table}</p>
              <h3>{text.table}</h3>
              <p>{text.tableDescription}</p>
            </div>
          </div>

          <div className="di-table-wrap">
            <table className="di-table">
              <thead>
                <tr>
                  <th>{text.wilaya}</th>
                  <th>{text.revenue}</th>
                  <th>{text.clients}</th>
                  <th>{text.orders}</th>
                  <th>{text.growth}</th>
                  <th>{text.marketShare}</th>
                  <th>{text.status}</th>
                </tr>
              </thead>

              <tbody>
                {wilayas.map((wilaya) => (
                  <tr key={wilaya.id}>
                    <td>
                      <div className="di-primary-cell">
                        <strong>{wilaya.name}</strong>
                        <span>Code {wilaya.id}</span>
                      </div>
                    </td>

                    <td>{wilaya.revenue}M DA</td>
                    <td>{wilaya.clients}</td>
                    <td>{wilaya.orders}</td>

                    <td>
                      <span
                        className={
                          wilaya.growth >= 0
                            ? "di-positive"
                            : "di-negative"
                        }
                      >
                        {wilaya.growth >= 0 ? "+" : ""}
                        {wilaya.growth}%
                      </span>
                    </td>

                    <td>{wilaya.share}%</td>

                    <td>
                      <span
                        className={`di-status di-status--risk-${wilaya.risk}`}
                      >
                        {riskLabels[wilaya.risk]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </ScrollReveal>
    </section>
  );
}

export default WilayaIntelligence;