import { CornerDownLeft, Search } from "lucide-react";

import energicalLogo from "../../assets/energical-logo.png";
import { formatDateTime } from "../../utils/formatters.js";
import ThemeSwitcher from "../Common/ThemeSwitcher.jsx";

const topbarTranslations = {
  en: {
    platform: "Intelligence Decision Platform",
    searchPlaceholder: "Search clients, products or wilayas",
    search: "Search",
    dataStatus: "Data status",
    noData: "No processed data",
    qualityReady: "Processing result ready",
    processing: "Processing upload",
    error: "Processing needs review",
    noUpload: "No uploaded refresh",
    searchHint: "Ctrl K",
    languageControl: "Language",
    workspace: "Workspace",
  },
  fr: {
    platform: "Plateforme d’aide à la décision",
    searchPlaceholder: "Rechercher des clients, produits ou wilayas",
    search: "Rechercher",
    dataStatus: "Statut des données",
    noData: "Aucune donnée traitée",
    qualityReady: "Résultat du traitement prêt",
    processing: "Import en traitement",
    error: "Traitement à vérifier",
    noUpload: "Aucune actualisation importée",
    searchHint: "Ctrl K",
    languageControl: "Langue",
    workspace: "Espace",
  },
};

function Topbar({
  activeTab,
  language,
  onToggleLanguage,
  latestPipelineRun,
  theme,
  onThemeChange,
  onOpenSearch,
}) {
  const text = topbarTranslations[language] || topbarTranslations.en;
  const statusKey = latestPipelineRun
    ? latestPipelineRun.status === "completed"
      ? "updated"
      : latestPipelineRun.status === "failed"
        ? "error"
        : "processing"
    : "empty";
  const statusLabel = latestPipelineRun
    ? latestPipelineRun.status === "completed"
      ? text.qualityReady
      : latestPipelineRun.status === "failed"
        ? text.error
        : text.processing
    : text.noData;

  const handleSubmit = (event) => {
    event.preventDefault();
    const query = new FormData(event.currentTarget).get("platform-search");
    onOpenSearch(query?.toString().trim() || "");
  };

  return (
    <header className="eidp-topbar">
      <div className="eidp-topbar-left">
        <div className="eidp-brand">
          <img src={energicalLogo} alt="Energical" className="eidp-brand-logo" />
          <div className="eidp-brand-copy">
            <span className="eidp-company-name">ENERGICAL</span>
            <span className="eidp-platform-name">{text.platform}</span>
          </div>
        </div>
        <div className="eidp-page-context">
          <span className="eidp-page-context-kicker">{text.workspace} / {activeTab.id}</span>
          <h1>{activeTab.title[language]}</h1>
          <p>{activeTab.description[language]}</p>
        </div>
      </div>

      <form className="eidp-topbar-search" onSubmit={handleSubmit}>
        <label className="eidp-search">
          <Search size={17} strokeWidth={1.8} aria-hidden="true" />
          <span className="sr-only">{text.search}</span>
          <input name="platform-search" type="search" placeholder={text.searchPlaceholder} />
          <kbd>{text.searchHint}</kbd>
          <button type="submit" aria-label={text.search}>
            <CornerDownLeft size={15} strokeWidth={1.9} aria-hidden="true" />
          </button>
        </label>
      </form>

      <div className="eidp-topbar-meta">
        <div className="topbar-preferences">
          <ThemeSwitcher language={language} theme={theme} onThemeChange={onThemeChange} />
          <span className="topbar-preferences-divider" aria-hidden="true" />
          <div className="compact-segmented-control compact-language-control" role="group" aria-label={text.languageControl}>
            <button type="button" aria-pressed={language === "en"} className={language === "en" ? "is-active" : ""} onClick={() => language !== "en" && onToggleLanguage()}>EN</button>
            <button type="button" aria-pressed={language === "fr"} className={language === "fr" ? "is-active" : ""} onClick={() => language !== "fr" && onToggleLanguage()}>FR</button>
          </div>
        </div>

        <div className={`eidp-update-status eidp-update-status--${statusKey}`}>
          <span className="eidp-update-status-label">{text.dataStatus}</span>
          <strong><i aria-hidden="true" />{statusLabel}</strong>
          <small>{latestPipelineRun?.updated_at ? formatDateTime(latestPipelineRun.updated_at, language) : text.noUpload}</small>
        </div>
      </div>
    </header>
  );
}

export default Topbar;
