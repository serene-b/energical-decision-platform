import { useState } from "react";
import energicalLogo from "../../assets/energical-logo.png";

const topbarTranslations = {
  en: {
    platform: "Intelligence Decision Platform",
    searchPlaceholder:
      "Search clients, products or wilayas",
    search: "Search",
    lastUpdated: "Last updated",
    today: "Today",
    languageButton: "FR",
    languageTitle: "Passer en français",
  },

  fr: {
    platform: "Plateforme d’aide à la décision",
    searchPlaceholder:
      "Rechercher des clients, produits ou wilayas",
    search: "Rechercher",
    lastUpdated: "Dernière mise à jour",
    today: "Aujourd’hui",
    languageButton: "EN",
    languageTitle: "Switch to English",
  },
};

function Topbar({
  activeTab,
  language,
  onToggleLanguage,
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const text = topbarTranslations[language];

  const handleSearch = (event) => {
    event.preventDefault();

    const cleanQuery = searchQuery.trim();

    if (!cleanQuery) {
      return;
    }

    console.log("Searching for:", cleanQuery);
  };

  return (
    <header className="eidp-topbar">
      <div className="eidp-topbar-left">
        <div className="eidp-brand">
          <img
            src={energicalLogo}
            alt="Energical"
            className="eidp-brand-logo"
          />

          <div className="eidp-brand-copy">
            <span className="eidp-company-name">
              ENERGICAL
            </span>

            <span className="eidp-platform-name">
              {text.platform}
            </span>
          </div>
        </div>

        <div className="eidp-topbar-divider" />

        <div className="eidp-page-context">
          <h1>{activeTab.title[language]}</h1>

          <p>
            {activeTab.description[language]}
          </p>
        </div>
      </div>

      <form
        className="eidp-topbar-right"
        onSubmit={handleSearch}
      >
        <div className="eidp-search">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" />
          </svg>

          <input
            type="search"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
            }}
            placeholder={text.searchPlaceholder}
          />
        </div>

        <button
          type="submit"
          className="eidp-search-button"
        >
          {text.search}
        </button>

        <button
          type="button"
          className="eidp-language-button"
          onClick={onToggleLanguage}
          title={text.languageTitle}
        >
          {text.languageButton}
        </button>

        <div className="eidp-update-status">
          <span>{text.lastUpdated}</span>
          <strong>{text.today}</strong>
        </div>
      </form>
    </header>
  );
}

export default Topbar;