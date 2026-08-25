import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const overview = readFileSync(new URL("../src/Pages/Overview.jsx", import.meta.url), "utf8");
const trend = readFileSync(new URL("../src/components/Overview/InteractiveRevenueTrend.jsx", import.meta.url), "utf8");
const bubbleMap = readFileSync(new URL("../src/components/Overview/RevenueBubbleMap.jsx", import.meta.url), "utf8");
const topbar = readFileSync(new URL("../src/components/Layout/Topbar.jsx", import.meta.url), "utf8");
const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");

test("Overview uses independent approved analytics resources", () => {
  assert.match(overview, /useAnalyticsResource\("overview"\)/);
  assert.match(overview, /useAnalyticsResource\("wilayas"\)/);
  assert.match(overview, /useAnalyticsResource\("overviewProduct"\)/);
  assert.match(overview, /useAnalyticsResource\("overviewAlerts"\)/);
  assert.match(overview, /useRevenueTrendResource/);
  assert.match(overview, /geography_status === "valid_wilaya"/);
  assert.match(overview, /top_product/);
  assert.match(overview, /slice\(0, 3\)/);
  assert.doesNotMatch(overview, /Quality Review/i);
});

test("Overview exposes only date range and grouping controls", () => {
  assert.doesNotMatch(overview, /7d|30d|3m|6m|1y|preset/i);
  assert.match(overview, /\["daily", "weekly", "monthly"\]/);
  assert.match(overview, /startDate/);
  assert.match(overview, /endDate/);
  assert.match(overview, /applyDateRange/);
  assert.match(overview, /type="date"/);
  assert.match(trend, /react-plotly.js/);
  assert.match(trend, /displayModeBar: true/);
  assert.match(trend, /scrollZoom: true/);
  assert.match(trend, /doubleClick: "reset"/);
  assert.match(trend, /hovertemplate/);
});

test("Overview bubble map uses supported coordinates and square-root scaling", () => {
  assert.match(bubbleMap, /wilaya\.geography_status === "valid_wilaya"/);
  assert.match(bubbleMap, /Math\.sqrt\(revenue \/ maxRevenue\)/);
  assert.match(bubbleMap, /BUBBLE_MIN_RADIUS/);
  assert.match(bubbleMap, /BUBBLE_MAX_RADIUS/);
  assert.match(bubbleMap, /type: "scattergeo"/);
  assert.match(bubbleMap, /sizemode: "diameter"/);
  assert.match(bubbleMap, /wilaya\.latitude/);
  assert.match(bubbleMap, /wilaya\.longitude/);
  assert.match(bubbleMap, /onSelect/);
  assert.doesNotMatch(bubbleMap, /fetch\("\/maps\/algeria-wilayas\.svg"/);
});

test("Overview keeps localized SPA navigation labels", () => {
  assert.match(overview, /viewSales: "View Sales Intelligence"/);
  assert.match(overview, /viewSales: "Voir l’intelligence ventes"/);
  assert.match(overview, /viewWilayas: "View Wilaya Intelligence"/);
  assert.match(overview, /viewProducts: "View Products & Forecast"/);
  assert.match(overview, /viewAlerts: "View all alerts"/);
  assert.match(overview, /onNavigate\?\.\("sales"\)/);
  assert.match(overview, /onNavigate\?\.\("clients"\)/);
  assert.match(overview, /onNavigate\?\.\("wilayas"/);
  assert.match(overview, /onNavigate\?\.\("products"\)/);
  assert.match(overview, /onNavigate\?\.\("alerts"\)/);
});

test("adaptive header has full, hidden, and compact scroll states", () => {
  assert.match(topbar, /setDisplayMode\("full"\)/);
  assert.match(topbar, /setDisplayMode\("hidden"\)/);
  assert.match(topbar, /setDisplayMode\("compact"\)/);
  assert.match(topbar, /currentY <= 32/);
  assert.match(topbar, /data-display-mode/);
});

test("Overview uses one scoped parent-relative workspace", () => {
  assert.match(app, /activeTabId === "overview"[^\n]+main-content--overview/);
  assert.match(styles, /--overview-outer-gutter: clamp\(24px, 2vw, 32px\)/);
  assert.match(styles, /--overview-workspace-max-width: none/);
  assert.match(styles, /width: calc\(100% - \(2 \* var\(--overview-outer-gutter\)\)\)/);
  assert.match(styles, /\.main-content--overview > \.eidp-topbar,[\s\S]+\.main-content--overview > \.page-transition/);
  assert.match(styles, /\.main-content--overview \.overview-lower-grid[\s\S]+repeat\(2, minmax\(0, 1fr\)\)/);
  assert.doesNotMatch(`${overview}\n${trend}\n${bubbleMap}`, /100vw/);
});
