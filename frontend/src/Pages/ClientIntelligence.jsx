import { useMemo, useState } from "react";
import ScrollReveal from "../components/common/ScrollReveal.jsx";

const translations = {
  en: {
    eyebrow: "Client portfolio",
    title: "Client Intelligence",
    description:
      "Understand client value, activity, reliability, purchasing history, and commercial risk.",
    export: "Export client report",
    demo: "Demonstration data",

    totalClients: "Total clients",
    totalClientsNote: "Clients with at least one completed purchase",
    b2bClients: "B2B clients",
    b2bClientsNote: "Companies and professional accounts",
    b2cClients: "B2C clients",
    b2cClientsNote: "Individual buyers",
    atRiskClients: "At-risk clients",
    atRiskClientsNote: "Require retention attention",

    segmentation: "Client segmentation",
    segmentationDescription:
      "Distribution based on purchasing activity and reliability.",
    champions: "Champions",
    active: "Active",
    atRisk: "At risk",
    dormant: "Dormant",

    revenueMix: "Revenue contribution",
    revenueMixDescription:
      "Comparison between B2B and B2C client revenue.",
    b2bRevenue: "B2B revenue",
    b2cRevenue: "B2C revenue",
    totalRevenue: "Total revenue",
    averageOrder: "Average order",
    orders: "Orders",

    reliability: "Reliability overview",
    reliabilityDescription:
      "Current distribution of client reliability scores.",
    highlyReliable: "Highly reliable",
    reliable: "Reliable",
    mediumRisk: "Medium risk",
    highRisk: "High risk",

    directory: "Client directory",
    directoryDescription:
      "Search, filter, and review individual client performance.",
    searchPlaceholder: "Search client or wilaya",
    allTypes: "All client types",
    allStatuses: "All statuses",

    client: "Client",
    type: "Type",
    wilaya: "Wilaya",
    orderCount: "Orders",
    revenue: "Revenue",
    score: "Reliability",
    status: "Status",
    lastOrder: "Last order",
    noResults: "No clients match the selected filters.",
  },

  fr: {
    eyebrow: "Portefeuille clients",
    title: "Intelligence clients",
    description:
      "Analysez la valeur, l’activité, la fiabilité, l’historique d’achat et le risque commercial des clients.",
    export: "Exporter le rapport",
    demo: "Données de démonstration",

    totalClients: "Total des clients",
    totalClientsNote: "Clients ayant effectué au moins un achat",
    b2bClients: "Clients B2B",
    b2bClientsNote: "Entreprises et comptes professionnels",
    b2cClients: "Clients B2C",
    b2cClientsNote: "Acheteurs particuliers",
    atRiskClients: "Clients à risque",
    atRiskClientsNote: "Nécessitent une action de fidélisation",

    segmentation: "Segmentation des clients",
    segmentationDescription:
      "Répartition selon l’activité d’achat et la fiabilité.",
    champions: "Champions",
    active: "Actifs",
    atRisk: "À risque",
    dormant: "Dormants",

    revenueMix: "Contribution au chiffre d’affaires",
    revenueMixDescription:
      "Comparaison des revenus générés par les clients B2B et B2C.",
    b2bRevenue: "Revenu B2B",
    b2cRevenue: "Revenu B2C",
    totalRevenue: "Chiffre d’affaires",
    averageOrder: "Commande moyenne",
    orders: "Commandes",

    reliability: "Aperçu de la fiabilité",
    reliabilityDescription:
      "Répartition actuelle des scores de fiabilité des clients.",
    highlyReliable: "Très fiables",
    reliable: "Fiables",
    mediumRisk: "Risque moyen",
    highRisk: "Risque élevé",

    directory: "Répertoire des clients",
    directoryDescription:
      "Recherchez, filtrez et analysez les performances individuelles.",
    searchPlaceholder: "Rechercher un client ou une wilaya",
    allTypes: "Tous les types",
    allStatuses: "Tous les statuts",

    client: "Client",
    type: "Type",
    wilaya: "Wilaya",
    orderCount: "Commandes",
    revenue: "Revenu",
    score: "Fiabilité",
    status: "Statut",
    lastOrder: "Dernière commande",
    noResults: "Aucun client ne correspond aux filtres sélectionnés.",
  },
};

const clients = [
  {
    id: "CL-1001",
    name: "SARL Atlas Informatique",
    type: "B2B",
    wilaya: "Alger",
    orders: 84,
    revenue: "12.8M DA",
    reliability: 94,
    status: "champions",
    lastOrder: "2026-07-15",
  },
  {
    id: "CL-1002",
    name: "EURL Bureau Plus",
    type: "B2B",
    wilaya: "Oran",
    orders: 51,
    revenue: "8.4M DA",
    reliability: 87,
    status: "active",
    lastOrder: "2026-07-12",
  },
  {
    id: "CL-1003",
    name: "Amine Bensalem",
    type: "B2C",
    wilaya: "Blida",
    orders: 17,
    revenue: "920K DA",
    reliability: 79,
    status: "active",
    lastOrder: "2026-07-08",
  },
  {
    id: "CL-1004",
    name: "SARL Digital Office",
    type: "B2B",
    wilaya: "Sétif",
    orders: 39,
    revenue: "6.7M DA",
    reliability: 58,
    status: "atRisk",
    lastOrder: "2026-05-19",
  },
  {
    id: "CL-1005",
    name: "Lina Kaci",
    type: "B2C",
    wilaya: "Tizi Ouzou",
    orders: 11,
    revenue: "610K DA",
    reliability: 43,
    status: "atRisk",
    lastOrder: "2026-04-27",
  },
  {
    id: "CL-1006",
    name: "Groupe El Bahdja",
    type: "B2B",
    wilaya: "Alger",
    orders: 73,
    revenue: "10.2M DA",
    reliability: 91,
    status: "champions",
    lastOrder: "2026-07-17",
  },
  {
    id: "CL-1007",
    name: "Yacine Merabet",
    type: "B2C",
    wilaya: "Constantine",
    orders: 6,
    revenue: "285K DA",
    reliability: 31,
    status: "dormant",
    lastOrder: "2026-02-14",
  },
  {
    id: "CL-1008",
    name: "EURL Tech Distribution",
    type: "B2B",
    wilaya: "Annaba",
    orders: 28,
    revenue: "4.3M DA",
    reliability: 66,
    status: "active",
    lastOrder: "2026-06-26",
  },
];

const segmentData = [
  { key: "champions", value: 63, percentage: 1.5 },
  { key: "active", value: 1006, percentage: 24.5 },
  { key: "atRisk", value: 2277, percentage: 55.4 },
  { key: "dormant", value: 766, percentage: 18.6 },
];

const reliabilityData = [
  { key: "highlyReliable", value: 18 },
  { key: "reliable", value: 31 },
  { key: "mediumRisk", value: 34 },
  { key: "highRisk", value: 17 },
];

function ClientIntelligence({ language = "en" }) {
  const text = translations[language];

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const statusLabels = {
    champions: text.champions,
    active: text.active,
    atRisk: text.atRisk,
    dormant: text.dormant,
  };

  const filteredClients = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return clients.filter((client) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        client.name.toLowerCase().includes(normalizedSearch) ||
        client.wilaya.toLowerCase().includes(normalizedSearch) ||
        client.id.toLowerCase().includes(normalizedSearch);

      const matchesType =
        typeFilter === "all" || client.type === typeFilter;

      const matchesStatus =
        statusFilter === "all" || client.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [searchQuery, typeFilter, statusFilter]);

  const handleExport = () => {
    const rows = [
      [
        text.client,
        text.type,
        text.wilaya,
        text.orderCount,
        text.revenue,
        text.score,
        text.status,
        text.lastOrder,
      ],
      ...filteredClients.map((client) => [
        client.name,
        client.type,
        client.wilaya,
        client.orders,
        client.revenue,
        client.reliability,
        statusLabels[client.status],
        client.lastOrder,
      ]),
    ];

    const escapeCell = (value) => {
      const stringValue = String(value ?? "");

      if (
        stringValue.includes(";") ||
        stringValue.includes('"') ||
        stringValue.includes("\n")
      ) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }

      return stringValue;
    };

    const csv = rows
      .map((row) => row.map(escapeCell).join(";"))
      .join("\n");

    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "energical-client-intelligence.csv";

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
          <article className="di-kpi-card di-kpi-card--featured">
            <div className="di-kpi-top">
              <span>{text.totalClients}</span>
              <span className="di-kpi-tag">100%</span>
            </div>

            <strong className="di-kpi-value">4,112</strong>
            <p>{text.totalClientsNote}</p>
          </article>
        </ScrollReveal>

        <ScrollReveal className="di-fill" delay={80}>
          <article className="di-kpi-card">
            <div className="di-kpi-top">
              <span>{text.b2bClients}</span>
              <span className="di-kpi-index">01</span>
            </div>

            <strong className="di-kpi-value">846</strong>
            <p>{text.b2bClientsNote}</p>

            <div className="di-kpi-detail">
              <span>20.6%</span>
              <strong>68.4% revenue</strong>
            </div>
          </article>
        </ScrollReveal>

        <ScrollReveal className="di-fill" delay={120}>
          <article className="di-kpi-card">
            <div className="di-kpi-top">
              <span>{text.b2cClients}</span>
              <span className="di-kpi-index">02</span>
            </div>

            <strong className="di-kpi-value">3,266</strong>
            <p>{text.b2cClientsNote}</p>

            <div className="di-kpi-detail">
              <span>79.4%</span>
              <strong>31.6% revenue</strong>
            </div>
          </article>
        </ScrollReveal>

        <ScrollReveal className="di-fill" delay={160}>
          <article className="di-kpi-card">
            <div className="di-kpi-top">
              <span>{text.atRiskClients}</span>
              <span className="di-kpi-tag">55.4%</span>
            </div>

            <strong className="di-kpi-value di-value-orange">
              2,277
            </strong>

            <p>{text.atRiskClientsNote}</p>
          </article>
        </ScrollReveal>
      </div>

      <div className="di-grid di-grid--three">
        <ScrollReveal className="di-fill" delay={60}>
          <article className="di-panel client-segment-panel">
            <div className="di-panel-heading">
              <div>
                <p className="panel-eyebrow">{text.segmentation}</p>
                <h3>{text.segmentation}</h3>
                <p>{text.segmentationDescription}</p>
              </div>
            </div>

            <div className="client-segment-list">
              {segmentData.map((segment) => (
                <div className="client-segment-row" key={segment.key}>
                  <div className="client-segment-label">
                    <span>{statusLabels[segment.key]}</span>
                    <strong>
                      {segment.value.toLocaleString()} ·{" "}
                      {segment.percentage}%
                    </strong>
                  </div>

                  <div className="di-progress">
                    <span
                      style={{ width: `${segment.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>
        </ScrollReveal>

        <ScrollReveal className="di-fill" delay={100}>
          <article className="di-panel client-revenue-panel">
            <div className="di-panel-heading">
              <div>
                <p className="panel-eyebrow">{text.revenueMix}</p>
                <h3>{text.revenueMix}</h3>
                <p>{text.revenueMixDescription}</p>
              </div>
            </div>

            <div className="client-revenue-total">
              <span>{text.totalRevenue}</span>
              <strong>142M DA</strong>
            </div>

            <div className="client-revenue-bar">
              <span className="client-revenue-b2b" />
              <span className="client-revenue-b2c" />
            </div>

            <div className="client-revenue-comparison">
              <article>
                <span>{text.b2bRevenue}</span>
                <strong>97.1M DA</strong>
                <small>68.4%</small>
              </article>

              <article>
                <span>{text.b2cRevenue}</span>
                <strong>44.9M DA</strong>
                <small>31.6%</small>
              </article>
            </div>

            <div className="client-revenue-metrics">
              <div>
                <span>{text.averageOrder} B2B</span>
                <strong>18,792 DA</strong>
              </div>

              <div>
                <span>{text.averageOrder} B2C</span>
                <strong>4,568 DA</strong>
              </div>
            </div>
          </article>
        </ScrollReveal>

        <ScrollReveal className="di-fill" delay={140}>
          <article className="di-panel client-reliability-panel">
            <div className="di-panel-heading">
              <div>
                <p className="panel-eyebrow">{text.reliability}</p>
                <h3>{text.reliability}</h3>
                <p>{text.reliabilityDescription}</p>
              </div>
            </div>

            <div className="client-reliability-score">
              <strong>67.8</strong>
              <span>/ 100</span>
            </div>

            <div className="client-reliability-list">
              {reliabilityData.map((item) => (
                <div key={item.key}>
                  <div>
                    <span>{text[item.key]}</span>
                    <strong>{item.value}%</strong>
                  </div>

                  <div className="di-progress">
                    <span style={{ width: `${item.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </article>
        </ScrollReveal>
      </div>

      <ScrollReveal delay={100}>
        <article className="di-panel">
          <div className="di-panel-heading di-panel-heading--toolbar">
            <div>
              <p className="panel-eyebrow">{text.directory}</p>
              <h3>{text.directory}</h3>
              <p>{text.directoryDescription}</p>
            </div>

            <div className="di-toolbar">
              <input
                className="di-input"
                type="search"
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(event.target.value)
                }
                placeholder={text.searchPlaceholder}
              />

              <select
                className="di-select"
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(event.target.value)
                }
              >
                <option value="all">{text.allTypes}</option>
                <option value="B2B">B2B</option>
                <option value="B2C">B2C</option>
              </select>

              <select
                className="di-select"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
              >
                <option value="all">{text.allStatuses}</option>
                <option value="champions">{text.champions}</option>
                <option value="active">{text.active}</option>
                <option value="atRisk">{text.atRisk}</option>
                <option value="dormant">{text.dormant}</option>
              </select>
            </div>
          </div>

          <div className="di-table-wrap">
            <table className="di-table">
              <thead>
                <tr>
                  <th>{text.client}</th>
                  <th>{text.type}</th>
                  <th>{text.wilaya}</th>
                  <th>{text.orderCount}</th>
                  <th>{text.revenue}</th>
                  <th>{text.score}</th>
                  <th>{text.status}</th>
                  <th>{text.lastOrder}</th>
                </tr>
              </thead>

              <tbody>
                {filteredClients.map((client) => (
                  <tr key={client.id}>
                    <td>
                      <div className="di-primary-cell">
                        <strong>{client.name}</strong>
                        <span>{client.id}</span>
                      </div>
                    </td>

                    <td>
                      <span className="di-type-badge">
                        {client.type}
                      </span>
                    </td>

                    <td>{client.wilaya}</td>
                    <td>{client.orders}</td>
                    <td>{client.revenue}</td>

                    <td>
                      <div className="di-score">
                        <span>{client.reliability}</span>
                        <div className="di-progress">
                          <span
                            style={{
                              width: `${client.reliability}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`di-status di-status--${client.status}`}
                      >
                        {statusLabels[client.status]}
                      </span>
                    </td>

                    <td>{client.lastOrder}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredClients.length === 0 && (
              <div className="di-empty">{text.noResults}</div>
            )}
          </div>
        </article>
      </ScrollReveal>
    </section>
  );
}

export default ClientIntelligence;