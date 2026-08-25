import { request } from "./client.js";

export function getGA4IntegrationStatus({ signal } = {}) {
  return request("/integrations/ga4", { signal });
}

export function saveGA4Credentials(propertyId, credentialsJson, { signal } = {}) {
  return request("/integrations/ga4", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      property_id: propertyId,
      credentials_json: credentialsJson || null,
    }),
    signal,
  });
}

export function testGA4Connection(propertyId, credentialsJson, { signal } = {}) {
  return request("/integrations/ga4/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      property_id: propertyId,
      credentials_json: credentialsJson || null,
    }),
    signal,
  });
}

export function deleteGA4Credentials({ signal } = {}) {
  return request("/integrations/ga4", {
    method: "DELETE",
    signal,
  });
}
