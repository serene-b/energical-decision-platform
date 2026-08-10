function MetricIcon({ type }) {
  const commonProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };

  if (type === "risk") {
    return (
      <svg {...commonProps}>
        <path d="M10.3 3.8 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </svg>
    );
  }

  if (type === "champions") {
    return (
      <svg {...commonProps}>
        <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
      </svg>
    );
  }

  if (type === "sales") {
    return (
      <svg {...commonProps}>
        <path d="M6 2h12l1 5H5l1-5Z" />
        <path d="M5 7v13h14V7" />
        <path d="M9 11h6" />
        <path d="M9 15h4" />
      </svg>
    );
  }

  if (type === "forecast") {
    return (
      <svg {...commonProps}>
        <path d="M3 18h18" />
        <path d="m5 15 4-4 3 2 6-7" />
        <path d="M14 6h4v4" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M4 19V9" />
      <path d="M10 19V5" />
      <path d="M16 19v-7" />
      <path d="M22 19H2" />
    </svg>
  );
}

function KpiCard({
  title,
  value,
  description,
  trend,
  icon,
  accent = false,
  onClick,
  actionLabel,
}) {
  const isInteractive = typeof onClick === "function";

  const handleKeyDown = (event) => {
    if (isInteractive && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <article
      className={`kpi-card ${accent ? "kpi-card-accent" : ""} ${isInteractive ? "kpi-card--interactive" : ""}`}
      onClick={isInteractive ? onClick : undefined}
      onKeyDown={handleKeyDown}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={isInteractive ? actionLabel || title : undefined}
    >
      <div className="kpi-card-header">
        <p className="kpi-title">{title}</p>

        <span className="metric-icon">
          <MetricIcon type={icon} />
        </span>
      </div>

      <h3 className="kpi-value">{value}</h3>
      <p className="kpi-description">{description}</p>
      <p className="kpi-trend">{trend}</p>

      {isInteractive && (
        <span className="kpi-card-action" aria-hidden="true">
          Explore <span>→</span>
        </span>
      )}
    </article>
  );
}

export default KpiCard;
