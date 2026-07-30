import { useState } from "react";

import Sidebar from "./components/layout/Sidebar.jsx";
import Topbar from "./components/layout/Topbar.jsx";
import Footer from "./components/layout/Footer.jsx";

import Overview from "./pages/Overview.jsx";
import SalesIntelligence from "./pages/SalesIntelligence.jsx";
import ClientIntelligence from "./pages/ClientIntelligence.jsx";
import WilayaIntelligence from "./pages/WilayaIntelligence.jsx";
import CustomerBehavior from "./pages/CustomerBehavior.jsx";
import ProductsForecast from "./pages/ProductsForecast.jsx";
import ActionsAlerts from "./pages/ActionsAlerts.jsx";

const tabs = [
  {
    id: "overview",
    title: {
      en: "Overview",
      fr: "Vue d’ensemble",
    },
    description: {
      en: "Monitor revenue, customer risk, sales activity, and the three-month revenue forecast.",
      fr: "Suivez le chiffre d’affaires, les clients à risque, les ventes et les prévisions à trois mois.",
    },
  },
  {
    id: "sales",
    title: {
      en: "Sales Intelligence",
      fr: "Analyse des ventes",
    },
    description: {
      en: "Analyze total sales, average basket value, growth rate, and B2B versus B2C performance.",
      fr: "Analysez les ventes totales, le panier moyen, le taux de croissance et les performances B2B et B2C.",
    },
  },
  {
    id: "clients",
    title: {
      en: "Client Intelligence",
      fr: "Analyse clients",
    },
    description: {
      en: "Explore customer segments, client risk, B2B and B2C profiles, and individual customer information.",
      fr: "Explorez les segments clients, les risques, les profils B2B et B2C ainsi que les informations individuelles.",
    },
  },
  {
    id: "wilayas",
    title: {
      en: "Wilaya Intelligence",
      fr: "Analyse par wilaya",
    },
    description: {
      en: "Compare revenue, activity, risk, and business opportunities across Algerian wilayas.",
      fr: "Comparez les revenus, l’activité, les risques et les opportunités commerciales entre les wilayas.",
    },
  },
  {
    id: "behavior",
    title: {
      en: "Customer Behavior",
      fr: "Comportement client",
    },
    description: {
      en: "Analyze website traffic, customer journeys, acquisition channels, and conversions.",
      fr: "Analysez le trafic du site, les parcours clients, les canaux d’acquisition et les conversions.",
    },
  },
  {
    id: "products",
    title: {
      en: "Products & Forecast",
      fr: "Produits & prévisions",
    },
    description: {
      en: "Monitor product performance, forecasts, and restocking priorities.",
      fr: "Suivez les performances des produits, les prévisions et les priorités de réapprovisionnement.",
    },
  },
  {
    id: "alerts",
    title: {
      en: "Actions & Alerts",
      fr: "Actions & alertes",
    },
    description: {
      en: "Review anomalies, risks, recommended actions, and decision priorities.",
      fr: "Consultez les anomalies, les risques, les actions recommandées et les priorités de décision.",
    },
  },
];

const pageComponents = {
  overview: Overview,
  sales: SalesIntelligence,
  clients: ClientIntelligence,
  wilayas: WilayaIntelligence,
  behavior: CustomerBehavior,
  products: ProductsForecast,
  alerts: ActionsAlerts,
};

function App() {
  const [activeTabId, setActiveTabId] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [language, setLanguage] = useState("en");

  const activeTab =
    tabs.find((tab) => tab.id === activeTabId) || tabs[0];

  const ActivePage =
    pageComponents[activeTabId] || Overview;

  const toggleLanguage = () => {
    setLanguage((currentLanguage) =>
      currentLanguage === "en" ? "fr" : "en"
    );
  };

  return (
    <div className="app-layout">
      <Sidebar
        tabs={tabs}
        activeTabId={activeTabId}
        setActiveTabId={setActiveTabId}
        isOpen={sidebarOpen}
        onToggle={() => {
          setSidebarOpen((previousValue) => !previousValue);
        }}
        language={language}
      />

      <div className="main-content">
        <Topbar
          activeTab={activeTab}
          language={language}
          onToggleLanguage={toggleLanguage}
        />

        <ActivePage language={language} />

        <Footer />
      </div>
    </div>
  );
}

export default App;