export const overviewKpis = [
  {
    id: "revenue",
    title: {
      en: "Total Revenue",
      fr: "Chiffre d’affaires total",
    },
    value: "142M DA",
    description: {
      en: "Cumulative revenue generated",
      fr: "Chiffre d’affaires cumulé généré",
    },
    trend: {
      en: "+8.4% vs previous period",
      fr: "+8,4 % par rapport à la période précédente",
    },
    icon: "revenue",
    accent: true,
  },
  {
    id: "risk",
    title: {
      en: "At-Risk Clients",
      fr: "Clients à risque",
    },
    value: "2,277",
    description: {
      en: "Clients requiring retention action",
      fr: "Clients nécessitant une action de fidélisation",
    },
    trend: {
      en: "61.4M DA revenue at risk",
      fr: "61,4 M DA de chiffre d’affaires à risque",
    },
    icon: "risk",
  },
  {
    id: "champions",
    title: {
      en: "Champions",
      fr: "Champions",
    },
    value: "63",
    description: {
      en: "Highest-value loyal clients",
      fr: "Clients fidèles à plus forte valeur",
    },
    trend: {
      en: "Priority relationship segment",
      fr: "Segment relationnel prioritaire",
    },
    icon: "champions",
  },
  {
    id: "sales",
    title: {
      en: "Sales Number",
      fr: "Nombre de ventes",
    },
    value: "16,387",
    description: {
      en: "Completed sales transactions",
      fr: "Transactions de vente réalisées",
    },
    trend: {
      en: "Across B2B and B2C channels",
      fr: "Sur les canaux B2B et B2C",
    },
    icon: "sales",
  },
  {
    id: "forecast",
    title: {
      en: "3-Month Forecast",
      fr: "Prévision à 3 mois",
    },
    value: "+9%",
    description: {
      en: "Expected revenue development",
      fr: "Évolution attendue du chiffre d’affaires",
    },
    trend: {
      en: "Based on recent revenue patterns",
      fr: "Basée sur les tendances récentes des revenus",
    },
    icon: "forecast",
  },
];

export const overviewAlerts = [
  {
    id: 1,
    title: {
      en: "Client retention priority",
      fr: "Priorité de fidélisation",
    },
    description: {
      en: "2,277 clients require targeted retention actions.",
      fr: "2 277 clients nécessitent des actions de fidélisation ciblées.",
    },
    status: {
      en: "High priority",
      fr: "Priorité élevée",
    },
    priority: true,
  },
  {
    id: 2,
    title: {
      en: "Winter stock preparation",
      fr: "Préparation du stock hivernal",
    },
    description: {
      en: "Restocking should be finalized before October 15.",
      fr: "Le réapprovisionnement doit être finalisé avant le 15 octobre.",
    },
    status: {
      en: "Upcoming",
      fr: "À venir",
    },
    priority: true,
  },
  {
    id: 3,
    title: {
      en: "Regional opportunity",
      fr: "Opportunité régionale",
    },
    description: {
      en: "Tlemcen presents strong geographic growth potential.",
      fr: "Tlemcen présente un fort potentiel de croissance géographique.",
    },
    status: {
      en: "Opportunity",
      fr: "Opportunité",
    },
    priority: false,
  },
];

export const revenueSeries = [
  {
    month: {
      en: "Jan",
      fr: "Jan",
    },
    value: 8.2,
  },
  {
    month: {
      en: "Feb",
      fr: "Fév",
    },
    value: 10.4,
  },
  {
    month: {
      en: "Mar",
      fr: "Mars",
    },
    value: 9.6,
  },
  {
    month: {
      en: "Apr",
      fr: "Avr",
    },
    value: 13.8,
  },
  {
    month: {
      en: "May",
      fr: "Mai",
    },
    value: 12.9,
  },
  {
    month: {
      en: "Jun",
      fr: "Juin",
    },
    value: 17.4,
  },
];