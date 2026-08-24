import Plot from "react-plotly.js";

const EMPTY_POINTS = Object.freeze([]);

const copy = {
  en: {
    label: "Interactive realized-revenue trend",
    orders: "realized orders",
    partial: "Current partial period",
    partialAnnotation: "Partial",
    noData: "No realized revenue exists in this date range.",
    retry: "Retry",
    unavailable: "Revenue trend is temporarily unavailable.",
    loading: "Refreshing revenue trend",
    revenue: "Realized revenue",
  },
  fr: {
    label: "Evolution interactive du chiffre d’affaires realise",
    orders: "commandes realisees",
    partial: "Periode actuelle partielle",
    partialAnnotation: "Partielle",
    noData: "Aucun chiffre d’affaires realise sur cette periode.",
    retry: "Ressayer",
    unavailable: "L’evolution du chiffre d’affaires est temporairement indisponible.",
    loading: "Actualisation du chiffre d’affaires",
    revenue: "Chiffre d’affaires realise",
  },
};

function formatRevenue(value, language) {
  return new Intl.NumberFormat(language === "fr" ? "fr-DZ" : "en-DZ", {
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatPeriod(period, granularity, language, compact = false) {
  const locale = language === "fr" ? "fr-DZ" : "en-DZ";
  const normalized = granularity === "monthly" ? `${period}-01` : period;
  const date = new Date(`${normalized}T00:00:00`);
  if (Number.isNaN(date.getTime())) return period;
  if (granularity === "monthly") {
    return new Intl.DateTimeFormat(locale, compact
      ? { month: "short", year: "numeric" }
      : { month: "long", year: "numeric" }).format(date);
  }
  return new Intl.DateTimeFormat(locale, compact
    ? { day: "2-digit", month: "short", year: "numeric" }
    : { day: "2-digit", month: "long", year: "numeric" }).format(date);
}

function axisTickFormat(granularity) {
  if (granularity === "monthly") return "%b %Y";
  return "%d %b";
}

function InteractiveRevenueTrend({ resource, language = "en" }) {
  const text = copy[language] || copy.en;
  const points = resource.data?.trend || EMPTY_POINTS;
  const granularity = resource.data?.granularity || "monthly";
  const partialPoints = points.filter((point) => point.is_partial);

  if (resource.error && !resource.data) {
    return (
      <div className="overview-chart-state" role="alert">
        <span>{text.unavailable}</span>
        <button type="button" onClick={resource.retry}>{text.retry}</button>
      </div>
    );
  }

  if (resource.isLoading && !resource.data) {
    return <div className="overview-chart-state" role="status"><span>{text.loading}</span></div>;
  }

  if (!points.length) {
    return <div className="overview-chart-state">{text.noData}</div>;
  }

  const trace = {
    type: "scatter",
    mode: "lines+markers",
    name: text.revenue,
    x: points.map((point) => point.period),
    y: points.map((point) => Number(point.revenue || 0)),
    customdata: points.map((point) => [
      formatPeriod(point.period, granularity, language),
      Number(point.orders || 0),
      Boolean(point.is_partial),
    ]),
    line: { color: "#e8622c", width: 3, shape: "spline" },
    marker: {
      color: points.map((point) => point.is_partial ? "#f59b6e" : "#e8622c"),
      size: 8,
      line: { color: "#ffffff", width: 1.5 },
    },
    fill: "tozeroy",
    fillcolor: "rgba(232, 98, 44, 0.12)",
    hovertemplate: `<b>%{customdata[0]}</b><br>${text.revenue}: %{y:,.0f} DZD<br>%{customdata[1]:,.0f} ${text.orders}<extra></extra>`,
  };

  const annotations = partialPoints.length && granularity === "monthly"
    ? partialPoints.map((point) => ({
        x: point.period,
        y: Number(point.revenue || 0),
        text: text.partialAnnotation,
        showarrow: true,
        arrowcolor: "#e8622c",
        font: { size: 10, color: "#906018" },
        bgcolor: "rgba(255, 247, 231, 0.95)",
        bordercolor: "rgba(232, 98, 44, 0.35)",
        borderpad: 3,
        ax: 0,
        ay: -32,
      }))
    : [];

  const layout = {
    autosize: true,
    height: 340,
    margin: { l: 54, r: 18, t: partialPoints.length ? 42 : 18, b: 58 },
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    hovermode: "x unified",
    font: { family: "Outfit, Arial, sans-serif", color: "#5f687c", size: 11 },
    showlegend: false,
    dragmode: "pan",
    annotations,
    xaxis: {
      type: "date",
      tickformat: axisTickFormat(granularity),
      tickfont: { family: "IBM Plex Mono, monospace", size: 10 },
      gridcolor: "#e4e8f0",
      linecolor: "#c5cedc",
      zeroline: false,
      fixedrange: false,
    },
    yaxis: {
      title: { text: "DZD", font: { size: 10 }, standoff: 8 },
      tickformat: "~s",
      tickfont: { family: "IBM Plex Mono, monospace", size: 10 },
      gridcolor: "#e4e8f0",
      linecolor: "#c5cedc",
      zeroline: false,
      fixedrange: false,
    },
  };

  const config = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    scrollZoom: true,
    doubleClick: "reset",
    modeBarButtonsToAdd: ["hoverClosestCartesian", "hoverCompareCartesian", "toggleSpikelines"],
    toImageButtonOptions: {
      format: "png",
      filename: "energical-realized-revenue-trend",
      scale: 2,
    },
  };

  return (
    <div className="overview-trend-explorer" role="region" aria-label={text.label}>
      <Plot
        className="overview-plotly-chart"
        data={[trace]}
        layout={layout}
        config={config}
        useResizeHandler
        revision={`${granularity}-${resource.response?.generated_at || "current"}-${points.length}`}
        style={{ width: "100%", height: "340px" }}
      />
      <div className="overview-trend-context overview-trend-plotly-hint" aria-live="polite">
        <span>{text.revenue}: <strong>{formatRevenue(points.reduce((sum, point) => sum + Number(point.revenue || 0), 0), language)} DZD</strong></span>
        {partialPoints.length > 0 && <em>{text.partial}</em>}
      </div>
      {resource.isLoading && <div className="overview-chart-loading" role="status"><span />{text.loading}</div>}
    </div>
  );
}

export default InteractiveRevenueTrend;
