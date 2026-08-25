import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  BellRing,
  Bot,
  Boxes,
  LayoutDashboard,
  MapPinned,
  TrendingUp,
  UploadCloud,
  Users,
} from "lucide-react";

import Sidebar from "./components/Layout/Sidebar.jsx";
import Topbar from "./components/Layout/Topbar.jsx";
import Footer from "./components/Layout/Footer.jsx";
import { getPipelineState } from "./api/pipeline.js";
import CommandPalette from "./components/Common/CommandPalette.jsx";
import {
  ContextualAssistantDrawer,
  ContextualInsightDrawer,
} from "./components/Common/ContextualAssistant.jsx";
import IntegrationSettingsModal from "./components/Common/IntegrationSettingsModal.jsx";

import Overview from "./Pages/Overview.jsx";
import SalesIntelligence from "./Pages/SalesIntelligence.jsx";
import ClientIntelligence from "./Pages/ClientIntelligence.jsx";
import WilayaIntelligence from "./Pages/WilayaIntelligence.jsx";
import CustomerBehavior from "./Pages/CustomerBehavior.jsx";
import ProductsForecast from "./Pages/ProductsForecast.jsx";
import ActionsAlerts from "./Pages/ActionsAlerts.jsx";
import DataUpload from "./Pages/DataUpload.jsx";

const tabs = [
  {
    id: "upload",
    title: { en: "Data Upload", fr: "Import des données" },
    description: {
      en: "Validate a CSV, review data quality, and prepare an application refresh.",
      fr: "Validez un CSV, contrôlez sa qualité et préparez l’actualisation de l’application.",
    },
    icon: UploadCloud,
  },
  {
    id: "overview",
    title: { en: "Overview", fr: "Vue d’ensemble" },
    description: {
      en: "Explore realized revenue, customers, Wilaya concentration, products, and verified business alerts.",
      fr: "Explorez le revenu réalisé, les clients, la concentration par wilaya, les produits et les alertes métier vérifiées.",
    },
    icon: LayoutDashboard,
  },
  {
    id: "sales",
    title: { en: "Sales Intelligence", fr: "Analyse des ventes" },
    description: {
      en: "Analyze realized revenue, order volume, customer type, payment, and delivery aggregates.",
      fr: "Analysez les ventes totales, le panier moyen, le taux de croissance et les performances B2B et B2C.",
    },
    icon: TrendingUp,
  },
  {
    id: "clients",
    title: { en: "Client Intelligence", fr: "Analyse clients" },
    description: {
      en: "Explore aggregate customer type and geographic signals without exposing individual customer records.",
      fr: "Explorez les segments clients, les risques, les profils B2B et B2C ainsi que les informations individuelles.",
    },
    icon: Users,
  },
  {
    id: "wilayas",
    title: { en: "Wilaya Intelligence", fr: "Analyse par wilaya" },
    description: {
      en: "Compare normalized-wilaya revenue, activity, customer coverage, and transparent period signals.",
      fr: "Comparez les revenus, l’activité, les risques et les opportunités commerciales entre les wilayas.",
    },
    icon: MapPinned,
  },
  {
    id: "behavior",
    title: { en: "Customer Behavior", fr: "Comportement client" },
    description: {
      en: "Analyze website traffic, customer journeys, acquisition channels, and conversions.",
      fr: "Analysez le trafic du site, les parcours clients, les canaux d’acquisition et les conversions.",
    },
    icon: Activity,
  },
  {
    id: "products",
    title: { en: "Products & Forecast", fr: "Produits & prévisions" },
    description: {
      en: "Monitor approved product performance and the explicit status of forecasting experiments.",
      fr: "Suivez les performances des produits, les prévisions et les priorités de réapprovisionnement.",
    },
    icon: Boxes,
  },
  {
    id: "alerts",
    title: { en: "Actions & Alerts", fr: "Actions & alertes" },
    description: {
      en: "Review anomalies, risks, recommended actions, and decision priorities.",
      fr: "Consultez les anomalies, les risques, les actions recommandées et les priorités de décision.",
    },
    icon: BellRing,
  },
];

const pageComponents = {
  upload: DataUpload,
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
  const [latestPipelineRun, setLatestPipelineRun] = useState(null);
  const [databaseState, setDatabaseState] = useState(null);
  const [databaseStateError, setDatabaseStateError] = useState(false);
  const [theme, setTheme] = useState(() => {
    try {
      const storedTheme = window.localStorage.getItem("energical-theme");
      if (storedTheme === "light" || storedTheme === "dark") {
        return storedTheme;
      }
    } catch {
      // Fall through to the device preference.
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [insight, setInsight] = useState(null);
  const [assistantContext, setAssistantContext] = useState(null);

  const activeTab = tabs.find((tab) => tab.id === activeTabId) || tabs[0];
  const ActivePage = pageComponents[activeTabId] || Overview;

  const refreshDatabaseState = useCallback(() => {
    return getPipelineState()
      .then((state) => {
        setDatabaseState(state);
        setDatabaseStateError(false);
        return state;
      })
      .catch(() => {
        setDatabaseStateError(true);
        return null;
      });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    getPipelineState({ signal: controller.signal })
      .then((state) => {
        setDatabaseState(state);
        setDatabaseStateError(false);
      })
      .catch((error) => {
        if (error?.name !== "AbortError") setDatabaseStateError(true);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("energical-theme", theme);
    } catch {
      // Device-local preference persistence is best effort.
    }

    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggleLanguage = () => {
    setLanguage((currentLanguage) => (currentLanguage === "en" ? "fr" : "en"));
  };

  const handleNavigate = useCallback((tabId, context = null) => {
    setActiveTabId(tabId);
    setSidebarOpen(false);

    if (context) {
      setInsight(context);
    }
  }, []);

  const handlePipelineComplete = useCallback((run) => {
    setLatestPipelineRun(run);
    void refreshDatabaseState();
  }, [refreshDatabaseState]);

  const handleOpenSearch = useCallback((query = "") => {
    setSearchQuery(query);
    setSearchOpen(true);
  }, []);

  const handleCloseSearch = useCallback(() => {
    setSearchOpen(false);
  }, []);

  const handleAskAI = useCallback((context) => {
    const approvedMetrics = Object.fromEntries(
      Object.entries(context?.approved_metrics || {})
        .filter(([, value]) => ["string", "number", "boolean"].includes(typeof value))
        .slice(0, 20),
    );
    setAssistantContext({
      page: context?.page || activeTabId,
      selection_type: context?.selection_type || "dashboard_selection",
      selection: context?.selection || context?.selection_label || "Current selection",
      approved_metrics: approvedMetrics,
    });
    setInsight(null);
  }, [activeTabId]);

  const handleInsight = useCallback((nextInsight) => {
    setInsight(nextInsight);
    setAssistantContext(null);
  }, []);

  return (
    <div className="app-layout" data-language={language}>
      <Sidebar
        tabs={tabs}
        activeTabId={activeTabId}
        setActiveTabId={setActiveTabId}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((previousValue) => !previousValue)}
        language={language}
      />

      <div className={`main-content${activeTabId === "overview" ? " main-content--overview" : ""}`}>
        <Topbar
          activeTab={activeTab}
          adaptive={activeTabId === "overview"}
          language={language}
          onToggleLanguage={toggleLanguage}
          databaseState={databaseState}
          databaseStateError={databaseStateError}
          theme={theme}
          onThemeChange={setTheme}
          onOpenSearch={handleOpenSearch}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        <div className="page-transition" key={activeTabId}>
          <ActivePage
            language={language}
            onPipelineComplete={handlePipelineComplete}
            onNavigate={handleNavigate}
            onInsight={handleInsight}
            onAskAI={handleAskAI}
          />
        </div>

        <Footer />
      </div>

      <IntegrationSettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        language={language}
        onSaved={() => {
          setSettingsOpen(false);
          void refreshDatabaseState();
        }}
      />

      <ContextualInsightDrawer
        insight={insight}
        language={language}
        onClose={() => setInsight(null)}
        onAskAI={handleAskAI}
        onNavigate={handleNavigate}
      />

      <ContextualAssistantDrawer
        context={assistantContext}
        language={language}
        onClose={() => setAssistantContext(null)}
      />

      <button
        type="button"
        className="assistant-launcher"
        aria-label={language === "fr" ? "Ouvrir l’assistant IA" : "Open AI assistant"}
        title={language === "fr" ? "Assistant IA Energical" : "Energical AI Assistant"}
        onClick={() => handleAskAI(insight?.aiContext || insight || {
          page: activeTabId,
          selection_type: activeTabId === "upload" && latestPipelineRun?.result ? "pipeline_summary" : "current_page",
          selection: activeTabId === "upload" && latestPipelineRun?.result ? "Latest processing result" : activeTab.title[language],
          approved_metrics: activeTabId === "upload" && latestPipelineRun?.result ? {
            total_files: latestPipelineRun.result.total_files,
            total_rows_raw: latestPipelineRun.result.total_rows_raw,
            total_rows_cleaned: latestPipelineRun.result.total_rows_cleaned,
            total_missing_values: latestPipelineRun.result.total_missing_values,
            duplicate_rows_removed: latestPipelineRun.result.total_duplicate_rows_removed,
          } : {},
        })}
      >
        <span className="assistant-launcher-icon">
          <Bot size={17} strokeWidth={2} />
        </span>
        <span className="assistant-launcher-label">
          {language === "fr" ? "Assistant IA" : "Ask AI"}
        </span>
      </button>

      <CommandPalette
        key={`${searchOpen ? "open" : "closed"}-${searchQuery}`}
        isOpen={searchOpen}
        initialQuery={searchQuery}
        tabs={tabs}
        language={language}
        onClose={handleCloseSearch}
        onNavigate={handleNavigate}
      />
    </div>
  );
}

export default App;
