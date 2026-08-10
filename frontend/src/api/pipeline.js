import { getApiBaseUrl, request, ApiClientError } from "./client.js";

export { ApiClientError, getApiBaseUrl };

export function uploadPipelineRun(files, { datasetType, signal } = {}) {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  if (datasetType) formData.append("dataset_type", datasetType);

  return request("/pipeline/runs", {
    method: "POST",
    body: formData,
    signal,
  });
}

export function getPipelineRun(runId, { signal } = {}) {
  return request(`/pipeline/runs/${encodeURIComponent(runId)}`, { signal });
}

export function getApiHealth({ signal } = {}) {
  return request("/health", { signal });
}

export function queryAssistant(payload, { signal } = {}) {
  return request("/assistant/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
}

