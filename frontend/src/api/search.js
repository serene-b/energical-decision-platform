import { request } from "./client.js";

export function searchPlatform(query, { limit = 20, signal } = {}) {
  const params = new URLSearchParams({
    q: query || "",
    limit: String(limit),
  });
  return request(`/search?${params.toString()}`, { signal });
}
