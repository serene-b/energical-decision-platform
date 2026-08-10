const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:8000/api/v1"
).replace(/\/$/, "");

export class ApiClientError extends Error {
  constructor(message, { code = "request_failed", details = [], status = 0 } = {}) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

export async function request(path, options = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, options);
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    if (import.meta.env.DEV) {
      console.error("[Energical API] request could not reach the backend", { path, error });
    }
    throw new ApiClientError(
      "The API could not be reached. Start the backend and try again.",
      { code: "network_error" },
    );
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const errorPayload = payload?.error;
    const fallbackMessage = response.status >= 500
      ? `The backend returned an error (HTTP ${response.status}).`
      : `The API rejected the request (HTTP ${response.status}).`;
    if (import.meta.env.DEV) {
      console.error("[Energical API] request failed", {
        path,
        status: response.status,
        code: errorPayload?.code || "request_failed",
      });
    }
    throw new ApiClientError(
      errorPayload?.message || fallbackMessage,
      {
        code: errorPayload?.code || "request_failed",
        details: errorPayload?.details || [],
        status: response.status,
      },
    );
  }

  return payload;
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}
