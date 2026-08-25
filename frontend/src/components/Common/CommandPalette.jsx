import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowUpRight,
  Command,
  Compass,
  Loader2,
  MapPin,
  Package,
  Search,
  Users,
  X,
} from "lucide-react";
import { searchPlatform } from "../../api/search.js";

const translations = {
  en: {
    title: "Explore Energical",
    subtitle: "Search database clients, SKUs, wilayas, and decision views in real-time.",
    placeholder: "Search clients, products, wilayas, or modules…",
    navigation: "Navigation & Views",
    wilayas: "Wilayas & Regions",
    clients: "Clients & Accounts",
    products: "Products & SKUs",
    noResults: "No matching entities found in database.",
    quickAccess: "Quick Access Views",
    open: "Open",
    searching: "Searching database…",
    badge: "Match",
  },
  fr: {
    title: "Explorer Energical",
    subtitle: "Recherchez clients, SKUs, wilayas et modules décisionnels en temps réel.",
    placeholder: "Rechercher des clients, produits, wilayas ou modules…",
    navigation: "Navigation & Modules",
    wilayas: "Wilayas & Régions",
    clients: "Clients & Comptes",
    products: "Produits & SKUs",
    noResults: "Aucun élément correspondant trouvé en base.",
    quickAccess: "Accès Rapide",
    open: "Ouvrir",
    searching: "Recherche en base…",
    badge: "Résultat",
  },
};

function getResultIcon(type) {
  switch (type) {
    case "wilaya":
      return <MapPin size={16} strokeWidth={1.9} style={{ color: "#e8622c" }} />;
    case "client":
      return <Users size={16} strokeWidth={1.9} style={{ color: "#257451" }} />;
    case "product":
      return <Package size={16} strokeWidth={1.9} style={{ color: "#0066cc" }} />;
    default:
      return <Compass size={16} strokeWidth={1.9} style={{ color: "var(--accent)" }} />;
  }
}

function CommandPalette({
  isOpen,
  initialQuery = "",
  tabs = [],
  language = "en",
  onClose,
  onNavigate,
}) {
  const [query, setQuery] = useState(initialQuery);
  const [dbResults, setDbResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const text = translations[language] || translations.en;

  useEffect(() => {
    if (!isOpen) return undefined;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 20);

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const trimmed = query.trim();

    if (!trimmed) {
      return undefined;
    }

    const controller = new AbortController();
    debounceTimerRef.current = window.setTimeout(() => {
      setIsLoading(true);
      searchPlatform(trimmed, { limit: 16, signal: controller.signal })
        .then((data) => {
          setDbResults(data?.results || []);
          setIsLoading(false);
          setActiveIndex(0);
        })
        .catch((err) => {
          if (err.name !== "AbortError") {
            setIsLoading(false);
          }
        });
    }, 90);

    return () => {
      controller.abort();
      window.clearTimeout(debounceTimerRef.current);
    };
  }, [query, isOpen]);

  const defaultNavigationResults = useMemo(() => {
    return tabs.map((tab) => ({
      type: "navigation",
      id: tab.id,
      title: tab.title.en,
      title_fr: tab.title.fr,
      subtitle: tab.description.en,
      subtitle_fr: tab.description.fr,
      badge: "View",
      tab: tab.id,
      selection: null,
    }));
  }, [tabs]);

  const activeResultsList = query.trim() ? dbResults : defaultNavigationResults;

  const groupedResults = useMemo(() => {
    const groups = {
      navigation: [],
      wilaya: [],
      client: [],
      product: [],
    };
    activeResultsList.forEach((item) => {
      if (groups[item.type]) {
        groups[item.type].push(item);
      } else {
        groups.navigation.push(item);
      }
    });
    return groups;
  }, [activeResultsList]);

  const activateResult = (result) => {
    if (!result) return;
    if (result.tab) {
      const insightContext = result.type === "navigation" ? null : {
        page: result.tab,
        type: result.type,
        eyebrow: result.type === "wilaya" ? (language === "fr" ? "Intelligence Régionale" : "Regional Intelligence")
          : result.type === "client" ? (language === "fr" ? "Profil Client" : "Client Profile")
          : result.type === "product" ? (language === "fr" ? "Fiche Produit" : "Product Details")
          : (language === "fr" ? "Exploration" : "Contextual Insight"),
        title: language === "fr" ? (result.title_fr || result.title) : result.title,
        subtitle: language === "fr" ? (result.subtitle_fr || result.subtitle) : result.subtitle,
        description: language === "fr" ? (result.subtitle_fr || result.subtitle) : result.subtitle,
        selection: result.selection || result.id,
        selection_label: language === "fr" ? (result.title_fr || result.title) : result.title,
        metric_label: result.type === "wilaya" ? (language === "fr" ? "Chiffre d'Affaires" : "Total Revenue")
          : result.type === "client" ? (language === "fr" ? "Total Achats" : "Total Spend")
          : result.type === "product" ? (language === "fr" ? "Prix Unitaire" : "Unit Price")
          : (language === "fr" ? "Indicateur" : "Primary Indicator"),
        details: result.details || {},
        approved_metrics: result.approved_metrics || {},
        suggestions: [
          {
            id: `explore-${result.tab}`,
            label: {
              en: `Explore in ${result.tab.charAt(0).toUpperCase() + result.tab.slice(1)} Intelligence`,
              fr: `Explorer dans ${result.tab.charAt(0).toUpperCase() + result.tab.slice(1)}`,
            },
            tabId: result.tab,
            context: null,
          },
        ],
      };

      onNavigate(result.tab, insightContext);
    }
    onClose();
  };

  if (!isOpen) return null;

  let flatIndexCounter = -1;

  return createPortal(
    <div className="command-palette-backdrop" onMouseDown={onClose}>
      <section
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-labelledby="command-palette-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="command-palette-header">
          <div className="command-palette-title-row">
            <span className="command-palette-mark" aria-hidden="true">
              <Command size={17} strokeWidth={1.8} />
            </span>
            <div>
              <p className="panel-eyebrow">Enterprise Search</p>
              <h2 id="command-palette-title">{text.title}</h2>
            </div>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label={text.close}
          >
            <X size={17} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>

        <label className="command-palette-search">
          {isLoading ? (
            <Loader2 size={17} className="animate-spin" style={{ color: "var(--brand-orange)" }} />
          ) : (
            <Search size={17} strokeWidth={1.8} aria-hidden="true" />
          )}
          <span className="sr-only">{text.title}</span>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              const total = activeResultsList.length;
              if (!total) return;
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex((val) => (val + 1) % total);
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((val) => (val - 1 + total) % total);
              }
              if (event.key === "Enter") {
                event.preventDefault();
                activateResult(activeResultsList[activeIndex]);
              }
            }}
            placeholder={text.placeholder}
          />
          <kbd>ESC</kbd>
        </label>

        <div className="command-palette-results">
          {activeResultsList.length > 0 ? (
            <>
              {Object.entries(groupedResults).map(([groupKey, items]) => {
                if (!items.length) return null;
                const groupTitle = text[groupKey === "wilaya" ? "wilayas" : groupKey === "client" ? "clients" : groupKey === "product" ? "products" : query.trim() ? "navigation" : "quickAccess"];

                return (
                  <div className="command-palette-group" key={groupKey}>
                    <p className="command-palette-group-label">{groupTitle}</p>
                    {items.map((result) => {
                      flatIndexCounter += 1;
                      const currentIndex = flatIndexCounter;
                      const isSelected = activeIndex === currentIndex;
                      const title = language === "fr" && result.title_fr ? result.title_fr : result.title;
                      const subtitle = language === "fr" && result.subtitle_fr ? result.subtitle_fr : result.subtitle;

                      return (
                        <button
                          type="button"
                          className={`command-palette-result ${isSelected ? "is-active" : ""}`}
                          key={`${result.type}-${result.id}-${currentIndex}`}
                          onMouseEnter={() => setActiveIndex(currentIndex)}
                          onClick={() => activateResult(result)}
                        >
                          <span className="command-palette-result-icon" aria-hidden="true">
                            {getResultIcon(result.type)}
                          </span>
                          <span className="command-palette-result-copy">
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <strong>{title}</strong>
                              {result.badge && (
                                <span
                                  style={{
                                    fontSize: "0.68rem",
                                    padding: "2px 6px",
                                    borderRadius: "6px",
                                    fontWeight: 600,
                                    background: result.type === "wilaya" ? "rgba(232, 98, 44, 0.12)" : result.type === "client" ? "rgba(37, 116, 81, 0.12)" : result.type === "product" ? "rgba(0, 102, 204, 0.12)" : "rgba(255, 255, 255, 0.08)",
                                    color: result.type === "wilaya" ? "#e8622c" : result.type === "client" ? "#257451" : result.type === "product" ? "#0066cc" : "var(--text-secondary)",
                                  }}
                                >
                                  {result.badge}
                                </span>
                              )}
                            </div>
                            <small>{subtitle}</small>
                          </span>
                          <span className="command-palette-result-key">
                            <ArrowUpRight size={14} /> {text.open}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </>
          ) : (
            <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-muted)" }}>
              <p className="command-palette-empty">{text.noResults}</p>
            </div>
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}

export default CommandPalette;
