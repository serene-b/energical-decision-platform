import Plot from "react-plotly.js";

export const BUBBLE_MIN_RADIUS = 7;
export const BUBBLE_MAX_RADIUS = 28;

const copy = {
  en: {
    mapLabel: "Interactive proportional bubble map of realized revenue by Algerian wilaya",
    revenue: "Realized revenue",
    orders: "Realized orders",
    clients: "Clients",
    scale: "Radius uses sqrt(revenue / maximum), bounded from 7 to 28 px",
    source: "Geographic projection: Plotly Africa base map; official wilaya centroids from the API",
    open: "Open Wilaya Intelligence",
    unavailable: "No realized revenue has valid supported Wilaya coordinates.",
  },
  fr: {
    mapLabel: "Carte interactive a bulles proportionnelles du chiffre d'affaires realise par wilaya algerienne",
    revenue: "Chiffre d'affaires realise",
    orders: "Commandes realisees",
    clients: "Clients",
    scale: "Le rayon utilise sqrt(revenu / maximum), borne de 7 a 28 px",
    source: "Projection geographique : carte Plotly de l'Afrique ; centroïdes officiels fournis par l'API",
    open: "Ouvrir l'intelligence wilayas",
    unavailable: "Aucun revenu realise ne possede de coordonnees de wilaya valides et prises en charge.",
  },
};

function scaleRevenueToRadius(revenue, maxRevenue) {
  revenue = Math.max(0, Number(revenue) || 0);
  maxRevenue = Math.max(0, Number(maxRevenue) || 0);
  if (!maxRevenue) return BUBBLE_MIN_RADIUS;
  const ratio = Math.sqrt(revenue / maxRevenue);
  return BUBBLE_MIN_RADIUS + (BUBBLE_MAX_RADIUS - BUBBLE_MIN_RADIUS) * Math.min(ratio, 1);
}

function buildRevenueBubbles(wilayas = []) {
  const supported = wilayas.filter((wilaya) => (
    wilaya.geography_status === "valid_wilaya"
    && Number.isFinite(Number(wilaya.latitude))
    && Number.isFinite(Number(wilaya.longitude))
    && Number.isFinite(Number(wilaya.revenue))
    && Number(wilaya.revenue) >= 0
  ));
  const maxRevenue = Math.max(...supported.map((wilaya) => Number(wilaya.revenue) || 0), 0);
  return supported.map((wilaya) => {
    const revenue = Math.max(0, Number(wilaya.revenue) || 0);
    const radius = scaleRevenueToRadius(revenue, maxRevenue);
    return {
      ...wilaya,
      latitude: Number(wilaya.latitude),
      longitude: Number(wilaya.longitude),
      revenue,
      radius,
      diameter: radius * 2,
      maxRevenue,
    };
  });
}

function RevenueBubbleMap({ wilayas = [], language = "en", onSelect, onOpen }) {
  const text = copy[language] || copy.en;
  const bubbles = buildRevenueBubbles(wilayas);

  if (!bubbles.length) {
    return <div className="overview-optional-state">{text.unavailable}</div>;
  }

  const trace = {
    type: "scattergeo",
    mode: "markers",
    name: text.revenue,
    lat: bubbles.map((bubble) => bubble.latitude),
    lon: bubbles.map((bubble) => bubble.longitude),
    text: bubbles.map((bubble) => bubble.label),
    customdata: bubbles.map((bubble) => [
      bubble.id,
      bubble.label,
      bubble.revenue,
      Number(bubble.orders || 0),
      Number(bubble.clients || 0),
    ]),
    marker: {
      size: bubbles.map((bubble) => bubble.diameter),
      sizemode: "diameter",
      sizemin: BUBBLE_MIN_RADIUS * 2,
      color: bubbles.map((bubble) => bubble.revenue),
      cmin: 0,
      cmax: Math.max(bubbles[0].maxRevenue, 1),
      colorscale: [
        [0, "#ffd6bd"],
        [0.45, "#f58b55"],
        [1, "#d84f18"],
      ],
      opacity: 0.9,
      line: { color: "#ffffff", width: 1.5 },
      colorbar: {
        title: { text: text.revenue, side: "right", font: { size: 10 } },
        tickformat: ",.0f",
        thickness: 12,
        len: 0.68,
        outlinewidth: 0,
        tickfont: { size: 9 },
      },
    },
    hovertemplate: `<b>%{customdata[1]}</b><br>${text.revenue}: %{customdata[2]:,.0f} DZD<br>%{customdata[3]:,.0f} ${text.orders}<br>%{customdata[4]:,.0f} ${text.clients}<extra></extra>`,
  };

  const layout = {
    autosize: true,
    height: 430,
    margin: { l: 0, r: 0, t: 8, b: 8 },
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    showlegend: false,
    font: { family: "Outfit, Arial, sans-serif", color: "#5f687c", size: 11 },
    geo: {
      scope: "africa",
      resolution: 50,
      projection: { type: "mercator", scale: 4.9 },
      center: { lat: 28.5, lon: 2.5 },
      bgcolor: "transparent",
      showland: true,
      landcolor: "#edf1f6",
      showocean: true,
      oceancolor: "#f7f9fc",
      showcountries: true,
      countrycolor: "#b7c0cf",
      countrywidth: 0.7,
      showcoastlines: true,
      coastlinecolor: "#8792a5",
      coastlinewidth: 0.8,
      showlakes: false,
      lataxis: { showgrid: true, gridcolor: "rgba(137, 146, 167, 0.18)", range: [18, 38.5] },
      lonaxis: { showgrid: true, gridcolor: "rgba(137, 146, 167, 0.18)", range: [-9.5, 12.5] },
    },
  };

  const config = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    scrollZoom: true,
    doubleClick: "reset",
    toImageButtonOptions: {
      format: "png",
      filename: "energical-realized-revenue-by-wilaya",
      scale: 2,
    },
  };

  const handleClick = (event) => {
    const point = event?.points?.[0];
    if (!point?.customdata) return;
    const [id, label] = point.customdata;
    const bubble = bubbles.find((item) => String(item.id) === String(id) && item.label === label);
    if (bubble) onSelect?.(bubble.id, bubble.label, bubble);
  };

  return (
    <div className="overview-bubble-map-shell">
      <div className="overview-bubble-map-canvas overview-bubble-map-plotly" role="region" aria-label={text.mapLabel}>
        <Plot
          className="overview-map-plotly"
          data={[trace]}
          layout={layout}
          config={config}
          useResizeHandler
          onClick={handleClick}
          revision={`${bubbles.length}-${bubbles.map((bubble) => bubble.revenue).join("-")}`}
          style={{ width: "100%", height: "430px" }}
        />
      </div>

      <div className="overview-bubble-map-footer">
        <span><i aria-hidden="true" />{text.scale}</span>
        <button type="button" className="text-link" onClick={onOpen}>{text.open}</button>
      </div>
      <p className="overview-bubble-map-source">{text.source}</p>
    </div>
  );
}

export default RevenueBubbleMap;
