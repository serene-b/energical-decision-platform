import { getApiBaseUrl, request, requestBlob, ApiClientError } from "./client.js";

export { ApiClientError, getApiBaseUrl };

export function uploadPipelineRun(files, { datasetType, datasetTypes, signal } = {}) {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  if (datasetType) formData.append("dataset_type", datasetType);
  if (datasetTypes && Object.keys(datasetTypes).length) formData.append("dataset_types", JSON.stringify(datasetTypes));

  return request("/pipeline/runs", {
    method: "POST",
    body: formData,
    signal,
  });
}

export async function downloadPreparationReport(runId, { signal } = {}) {
  const { blob, contentDisposition } = await requestBlob(`/pipeline/runs/${encodeURIComponent(runId)}/report`, { signal });
  const filename = contentDisposition.match(/filename="?([^";]+)"?/i)?.[1] || `energical_data_preparation_report_${runId.slice(0, 8)}.pdf`;

  if (typeof document !== "undefined") {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }

  return { blob, filename };
}

export function getPipelineRun(runId, { signal } = {}) {
  return request(`/pipeline/runs/${encodeURIComponent(runId)}`, { signal });
}

export function getRecentPreparationRuns({ limit = 20, signal } = {}) {
  return request(`/pipeline/runs?limit=${encodeURIComponent(limit)}`, { signal });
}

export function getPipelineState({ signal } = {}) {
  return request("/pipeline/state", { signal });
}

async function downloadPipelineFile(path, fallbackFilename, { signal } = {}) {
  const { blob, contentDisposition } = await requestBlob(path, { signal });
  const filename = contentDisposition.match(/filename="?([^";]+)"?/i)?.[1] || fallbackFilename;

  if (typeof document !== "undefined") {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }

  return { blob, filename };
}

export function downloadCleanedDataset(runId, dataset, { signal } = {}) {
  return downloadPipelineFile(
    `/pipeline/runs/${encodeURIComponent(runId)}/cleaned/${encodeURIComponent(dataset)}`,
    `${dataset}_cleaned.csv`,
    { signal },
  );
}

export function downloadAllCleanedDatasets(runId, { signal } = {}) {
  return downloadPipelineFile(
    `/pipeline/runs/${encodeURIComponent(runId)}/cleaned.zip`,
    `cleaned_data_${runId.slice(0, 8)}.zip`,
    { signal },
  );
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

