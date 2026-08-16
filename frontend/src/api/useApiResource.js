import { useCallback, useEffect, useState } from "react";

import { getAnalytics, getOverviewRevenueTrend } from "./analytics.js";
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
            response.warnings?.[0] || "No supported business data is available in the configured database.",
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

export function useRevenueTrendResource({ granularity, startDate, endDate }) {
  const [state, setState] = useState({ data: null, response: null, isLoading: true, error: null });

  const load = useCallback((signal) => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    return getOverviewRevenueTrend(
      { granularity, startDate, endDate },
      { signal },
    )
      .then((response) => {
        const noDataError = response?.status === "no_data"
          ? new ApiClientError(
            response.warnings?.[0] || "No supported business data is available in the configured database.",
            { code: "analytics_not_available", status: 200 },
          )
          : null;
        setState({
          data: noDataError ? null : response?.data
            ? { ...response.data, scope: response.scope || {} }
            : null,
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
  }, [endDate, granularity, startDate]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => load(controller.signal), 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [load]);

  const retry = useCallback(() => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    return load();
  }, [load]);

  return { ...state, retry };
}
