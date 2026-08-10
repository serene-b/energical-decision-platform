import { useCallback, useEffect, useState } from "react";

import { getAnalytics } from "./analytics.js";
import { ApiClientError } from "./client.js";

export function useAnalyticsResource(domain) {
  const [state, setState] = useState({ data: null, response: null, isLoading: true, error: null });

  const load = useCallback((signal) => {
    return getAnalytics(domain, { signal })
      .then((response) => {
        const payload = response?.data
          ? {
              ...response.data,
              // AnalyticsResponse keeps envelope metadata separate from the
              // domain payload. Normalize it once so pages can consume one
              // stable data contract without duplicating adapter logic.
              scope: response.scope || response.data.scope || {},
              warnings: response.warnings || response.data.warnings || [],
          }
          : null;
        const noDataError = response?.status === "no_data"
          ? new ApiClientError(
            response.warnings?.[0] || "Upload and process a dataset before requesting analytics.",
            { code: "analytics_not_available", status: 200 },
          )
          : null;
        setState({
          data: noDataError ? null : payload,
          response,
          isLoading: false,
          error: noDataError,
        });
        return response;
      })
      .catch((error) => {
        if (error?.name === "AbortError") return null;
        setState((current) => ({ ...current, isLoading: false, error }));
        return null;
      });
  }, [domain]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const retry = useCallback(() => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    return load();
  }, [load]);
  return { ...state, retry };
}
