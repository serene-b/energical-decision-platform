import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Command, Search, X } from "lucide-react";

const translations = {
  en: {
    title: "Explore Energical",
    placeholder: "Search pages and analytical modules…",
    navigation: "Navigation",
    noResults: "No matching exploration paths.",
    close: "Close search",
    open: "Open",
  },
  fr: {
    title: "Explorer Energical",
    placeholder: "Rechercher une page ou un module analytique…",
    navigation: "Navigation",
    noResults: "Aucun parcours d’exploration correspondant.",
    close: "Fermer la recherche",
    open: "Ouvrir",
  },
};

function CommandPalette({ isOpen, initialQuery = "", tabs, language = "en", onClose, onNavigate }) {
  const [query, setQuery] = useState(initialQuery);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const text = translations[language] || translations.en;

  useEffect(() => {
    if (!isOpen) return undefined;
    window.setTimeout(() => inputRef.current?.focus(), 0);
    const handleKeyDown = (event) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return tabs.filter((tab) => !normalizedQuery || `${tab.title.en} ${tab.title.fr} ${tab.description.en} ${tab.description.fr}`.toLowerCase().includes(normalizedQuery));
  }, [query, tabs]);

  const activateResult = (result) => {
    onNavigate(result.id);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="command-palette-backdrop" onMouseDown={onClose}>
      <section className="command-palette" role="dialog" aria-modal="true" aria-labelledby="command-palette-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="command-palette-header">
          <div className="command-palette-title-row"><span className="command-palette-mark" aria-hidden="true"><Command size={17} strokeWidth={1.8} /></span><div><p className="panel-eyebrow">Decision intelligence</p><h2 id="command-palette-title">{text.title}</h2></div></div>
          <button type="button" className="icon-button" onClick={onClose} aria-label={text.close}><X size={17} strokeWidth={1.8} aria-hidden="true" /></button>
        </div>
        <label className="command-palette-search">
          <Search size={17} strokeWidth={1.8} aria-hidden="true" /><span className="sr-only">{text.title}</span>
          <input ref={inputRef} type="search" value={query} onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }} onKeyDown={(event) => { if (!results.length) return; if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((value) => (value + 1) % results.length); } if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((value) => (value - 1 + results.length) % results.length); } if (event.key === "Enter") { event.preventDefault(); activateResult(results[activeIndex]); } }} placeholder={text.placeholder} />
          <kbd>ESC</kbd>
        </label>
        <div className="command-palette-results">
          {results.length > 0 ? <div className="command-palette-group"><p className="command-palette-group-label">{text.navigation}</p>{results.map((result, index) => <button type="button" className={`command-palette-result ${activeIndex === index ? "is-active" : ""}`} key={result.id} onMouseEnter={() => setActiveIndex(index)} onClick={() => activateResult(result)}><span className="command-palette-result-icon" aria-hidden="true"><ArrowUpRight size={16} strokeWidth={1.8} /></span><span className="command-palette-result-copy"><strong>{result.title[language]}</strong><small>{result.description[language]}</small></span><span className="command-palette-result-key">{text.open}</span></button>)}</div> : <p className="command-palette-empty">{text.noResults}</p>}
        </div>
      </section>
    </div>
  );
}

export default CommandPalette;

