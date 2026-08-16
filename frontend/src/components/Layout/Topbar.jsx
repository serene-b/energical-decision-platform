import { CornerDownLeft, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import energicalLogo from "../../assets/energical-logo.png";
import { formatDateOnly } from "../../utils/formatters.js";
import ThemeSwitcher from "../Common/ThemeSwitcher.jsx";

const topbarTranslations = {
  en: {
    platform: "Intelligence Decision Platform",
    searchPlaceholder: "Search clients, products or wilayas",
    search: "Search",
    dataStatus: "Data status",
    dataAvailable: "Data available",
    dataThrough: "Data through",
    databaseChecking: "Checking database",
    databaseUnavailable: "Database status unavailable",
    databaseConnected: "Database connected",
    persistence: "PostgreSQL source of truth",
    noData: "No business data available",
    qualityReady: "Processing result ready",
    processing: "Processing upload",
    error: "Processing needs review",
    noUpload: "Database contains no business data",
    searchHint: "Ctrl K",
    languageControl: "Language",
    workspace: "Workspace",
    analyticsCurrent: "Analytics refreshed",
  },
  fr: {
    dataAvailable: "Donnees disponibles",
    dataThrough: "Donnees au",
    databaseChecking: "Verification de la base",
    databaseUnavailable: "Statut de base indisponible",
    databaseConnected: "Base connectee",
    persistence: "Source PostgreSQL de verite",
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
    analyticsCurrent: "Analytique actualisée",
  },
};

function Topbar({
  activeTab,
  adaptive = false,
  language,
  onToggleLanguage,
  databaseState = null,
  databaseStateError = false,
  theme,
  onThemeChange,
  onOpenSearch,
}) {
  const text = topbarTranslations[language] || topbarTranslations.en;
  const [displayMode, setDisplayMode] = useState("full");
  const scrollAnchorRef = useRef(0);

  useEffect(() => {
    if (!adaptive) return undefined;

    scrollAnchorRef.current = Math.max(window.scrollY, 0);
    let frame = window.requestAnimationFrame(() => {
      frame = 0;
      if (window.scrollY <= 32) setDisplayMode("full");
    });
    const handleScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const currentY = Math.max(window.scrollY, 0);
        if (currentY <= 32) {
          setDisplayMode("full");
          scrollAnchorRef.current = currentY;
          return;
        }
        const delta = currentY - scrollAnchorRef.current;
        if (delta > 8) {
          setDisplayMode("hidden");
          scrollAnchorRef.current = currentY;
        } else if (delta < -8) {
          setDisplayMode("compact");
          scrollAnchorRef.current = currentY;
        }
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [adaptive]);

  const effectiveDisplayMode = adaptive ? displayMode : "full";

  useEffect(() => {
    if (!adaptive) {
      delete document.documentElement.dataset.overviewHeader;
      return undefined;
    }
    document.documentElement.dataset.overviewHeader = effectiveDisplayMode;
    return () => {
      delete document.documentElement.dataset.overviewHeader;
    };
  }, [adaptive, effectiveDisplayMode]);

  const hasDatabaseData = databaseState?.data_available === true;
  const latestBusinessDate = databaseState?.latest_business_date
    || [databaseState?.latest_order_date, databaseState?.latest_transaction_date]
      .filter(Boolean)
      .sort()
      .at(-1);
  const statusKey = databaseStateError
    ? "error"
    : !databaseState
      ? "checking"
      : hasDatabaseData
        ? "available"
        : "empty";
  const statusLabel = databaseStateError
    ? text.databaseUnavailable
    : !databaseState
      ? text.databaseChecking
      : hasDatabaseData
        ? latestBusinessDate
          ? `${text.dataAvailable} · ${text.dataThrough} ${formatDateOnly(latestBusinessDate, language)}`
          : text.dataAvailable
        : text.noData;
  const statusMeta = databaseStateError
    ? ""
    : hasDatabaseData
      ? databaseState?.persistence === "postgres" ? text.persistence : text.databaseConnected
      : text.noUpload;

  const handleSubmit = (event) => {
    event.preventDefault();
    const query = new FormData(event.currentTarget).get("platform-search");
    onOpenSearch(query?.toString().trim() || "");
  };

  return (
    <header
      className={`eidp-topbar${adaptive ? " eidp-topbar--adaptive" : ""} eidp-topbar--${effectiveDisplayMode}`}
      aria-hidden={effectiveDisplayMode === "hidden" ? "true" : undefined}
      inert={effectiveDisplayMode === "hidden" ? true : undefined}
      data-display-mode={effectiveDisplayMode}
    >
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
          <small>{statusMeta}</small>
        </div>
      </div>
    </header>
  );
}

export default Topbar;
