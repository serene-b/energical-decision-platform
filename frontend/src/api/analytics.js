import { request } from "./client.js";

export const ANALYTICS_DOMAINS = Object.freeze({
  overview: "/analytics/overview",
  sales: "/analytics/sales",
  clients: "/analytics/clients",
  customers: "/analytics/customers",
  wilayas: "/analytics/wilayas",
  products: "/analytics/products",
  forecast: "/analytics/forecast",
  decisions: "/analytics/decisions",
  overviewAlerts: "/analytics/overview-alerts",
  overviewProduct: "/analytics/overview-product",
});

export function getAnalytics(domain, { signal } = {}) {
  const path = ANALYTICS_DOMAINS[domain] || `/analytics/${encodeURIComponent(domain)}`;
  return request(path, { signal });
}

export function getOverviewRevenueTrend(
  { granularity = "monthly", startDate = "", endDate = "" } = {},
  { signal } = {},
) {
  const query = new URLSearchParams({ granularity });
  if (startDate) query.set("start_date", startDate);
  if (endDate) query.set("end_date", endDate);
  return request(`/analytics/overview/revenue-trend?${query.toString()}`, { signal });
}

export function getAssistantContext(payload, { signal } = {}) {
  return request("/assistant/context", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
}

