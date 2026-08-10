import energicalLogo from "../../assets/energical-logo.png";

function Sidebar({
  tabs,
  activeTabId,
  setActiveTabId,
  isOpen,
  onToggle,
  language,
}) {
  return (
    <aside
      className={`sidebar ${
        isOpen ? "sidebar--open" : ""
      }`}
    >
      <button
        type="button"
        className="sidebar-toggle"
        onClick={onToggle}
        aria-label={
          isOpen
            ? language === "en"
              ? "Close navigation"
              : "Fermer la navigation"
            : language === "en"
              ? "Open navigation"
              : "Ouvrir la navigation"
        }
        aria-expanded={isOpen}
      >
        <svg
          className="sidebar-toggle-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          {isOpen ? (
            <>
              <path d="M6 6l12 12" />
              <path d="M18 6 6 18" />
            </>
          ) : (
            <>
              <path d="M4 7h16" />
              <path d="M4 12h16" />
              <path d="M4 17h16" />
            </>
          )}
        </svg>

        <span className="sidebar-toggle-label">
          {isOpen
            ? language === "en"
              ? "Close"
              : "Fermer"
            : "Menu"}
        </span>
      </button>

      <div className="sidebar-brand">
        <img
          src={energicalLogo}
          alt="Energical - Beyond Your Dreams"
          className="sidebar-logo"
        />
      </div>

      <nav
        className="sidebar-navigation"
        aria-label={language === "fr" ? "Navigation principale" : "Main navigation"}
      >
        <ul className="sidebar-links">
          {tabs.map((tab) => (
            <li
              key={tab.id}
              className={
                activeTabId === tab.id ? "active" : ""
              }
            >
              <button
                type="button"
                onClick={() => {
                  setActiveTabId(tab.id);
                  if (isOpen && window.innerWidth <= 820) {
                    onToggle();
                  }
                }}
                aria-current={activeTabId === tab.id ? "page" : undefined}
                title={tab.title[language]}
              >
                <span className="sidebar-link-icon" aria-hidden="true">
                  {tab.icon ? <tab.icon size={17} strokeWidth={1.8} /> : null}
                </span>
                <span className="sidebar-link-copy">{tab.title[language]}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

export default Sidebar;
