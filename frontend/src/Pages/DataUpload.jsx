import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  FileText,
  RefreshCw,
  UploadCloud,
  X,
} from "lucide-react";

import {
  ApiClientError,
  getApiHealth,
  getPipelineRun,
  uploadPipelineRun,
} from "../api/pipeline.js";
import ScrollReveal from "../components/Common/ScrollReveal.jsx";
import StatusBadge from "../components/Common/StatusBadge.jsx";
import { formatDateTime, formatFileSize, formatNumber } from "../utils/formatters.js";
import { parseCsvPreview } from "../utils/csvPreview.js";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const PIPELINE_STEPS = [
  { key: "upload", technical: ["upload", "validation"] },
  { key: "profile", technical: ["profiling"] },
  { key: "clean", technical: ["cleaning", "quality"] },
  { key: "analyze", technical: ["persistence", "analytics"] },
  { key: "ready", technical: ["ready"] },
];

function userStageFor(technicalStage) {
  return PIPELINE_STEPS.find((step) => step.technical.includes(technicalStage))?.key || "upload";
}

function userStepState(run, step) {
  if (!run) return step.key === "upload" ? "active" : "pending";
  const statuses = step.technical.map((key) => run.stages?.find((stage) => stage.key === key)?.status || "pending");
  if (statuses.includes("failed")) return "failed";
  if (statuses.every((status) => status === "completed")) return "completed";
  if (statuses.includes("running") || statuses.includes("completed")) return "running";
  return "pending";
}

const translations = {
  en: {
    eyebrow: "Operational data flow",
    title: "Prepare trustworthy data",
    description:
      "Upload a CSV, inspect its profile, apply approved deterministic cleaning, and review exactly what changed.",
    stages: { upload: "Upload", validation: "Validate", profiling: "Profile", cleaning: "Clean", quality: "Quality", persistence: "Persist", analytics: "Analyze", ready: "Ready" },
    userStages: { upload: "Upload", profile: "Profile", clean: "Clean", analyze: "Analyze", ready: "Ready" },
    userStageDescriptions: { upload: "Choose and validate the CSV.", profile: "Inspect the data profile.", clean: "Apply approved deterministic cleaning.", analyze: "Persist the snapshot and refresh analytics.", ready: "Review the result and open the dashboard." },
    stageDescriptions: {
      upload: "Validate the file and required columns.",
      validation: "Check file type, encoding, and row structure.",
      profiling: "Inspect schema, types, missing values, and duplicates.",
      cleaning: "Apply approved deterministic rules and recheck quality.",
      quality: "Make warnings and quarantined rows visible.",
      persistence: "Store the cleaned snapshot in the configured adapter.",
      analytics: "Refresh approved analytics without inventing outputs.",
      ready: "Return the structured processing result.",
    },
    connected: "Processing service connected",
    unavailable: "Processing service unavailable",
    checking: "Checking processing service",
    chooseFiles: "Choose CSV files",
    chooseFilesNote: "UTF-8 CSV · normalized analytical columns · 10 MB maximum per file",
    browse: "Browse files",
    datasetType: "Dataset type",
    autoDetect: "Auto-detect from schema",
    transactions: "Transactions",
    orders: "Orders",
    customers: "Customers",
    catalogue: "Catalogue",
    selectedFiles: "Selected files",
    noFiles: "No CSV selected yet.",
    remove: "Remove",
    start: "Start processing",
    starting: "Uploading…",
    retry: "Retry",
    reset: "Process another file",
    currentStage: "Current stage",
    resultReady: "Processing result ready",
    resultDescription:
      "Profiling, approved cleaning, quality checks, persistence, and analytics refresh completed.",
    openDashboard: "Open dashboard",
    dashboardNote: "The dashboard reads aggregate analytics from this processed run; forecasting remains explicitly pending.",
    files: "Files",
    rawRows: "Raw rows",
    cleanedRows: "Cleaned rows",
    rowsRemoved: "Rows removed",
    missingValues: "Missing values after cleaning",
    missingBeforeAfter: "Missing values",
    duplicatesRemoved: "Exact duplicates removed",
    profile: "Data profile",
    schemaValid: "Required schema valid",
    columns: "Columns",
    size: "File size",
    rawDuplicates: "Raw duplicates",
    columnName: "Column",
    inferredType: "Inferred type",
    populated: "Populated",
    missing: "Missing",
    unique: "Unique",
    issues: "Quality issues",
    noIssues: "No quality issues detected after approved cleaning.",
    cleaning: "Cleaning result",
    before: "Before",
    after: "After",
    appliedChanges: "Applied changes",
    noChanges: "The approved rules were evaluated; this file required no value changes.",
    rows: "Rows",
    affectedRows: "affected rows",
    affectedCells: "affected cells",
    rawPreview: "Raw preview",
    cleanedPreview: "Cleaned preview",
    previewNotice: "First five rows only. Preview values are not sent to the AI assistant.",
    deferred: "Rules deliberately deferred",
    deferredNote: "These decisions were not applied because they require business, statistical, or database confirmation.",
    analyticsBoundary: "Analytics integration boundary",
    analyticsBoundaryNote:
      "Approved deterministic analytics are now available through the dashboard. Forecasting and client risk remain pending decisions.",
    persistence: "Persistence",
    inMemory: "Development memory snapshot",
    postgres: "PostgreSQL snapshot",
    lastUpdated: "Completed",
    errorTitle: "Processing could not start",
    clientFileError: "Only UTF-8 CSV files up to 10 MB are accepted.",
    details: "Validation details",
    localRows: "locally detected rows",
  },
  fr: {
    userStages: { upload: "Import", profile: "Profil", clean: "Nettoyage", analyze: "Analyse", ready: "Pret" },
    userStageDescriptions: { upload: "Choisir et valider le CSV.", profile: "Examiner le profil des donnees.", clean: "Appliquer le nettoyage deterministe approuve.", analyze: "Persister l instantane et actualiser les analyses.", ready: "Verifier le resultat et ouvrir le tableau de bord." },
    eyebrow: "Flux de données opérationnel",
    title: "Préparer des données fiables",
    description:
      "Importez un CSV, examinez son profil, appliquez le nettoyage déterministe approuvé et contrôlez chaque changement.",
    stages: { upload: "Import", validation: "Validation", profiling: "Profil", cleaning: "Nettoyage", quality: "Qualité", persistence: "Persistance", analytics: "Analyse", ready: "Prêt" },
    stageDescriptions: {
      upload: "Valider le fichier et les colonnes requises.",
      validation: "Contrôler le type, l’encodage et la structure des lignes.",
      profiling: "Examiner le schéma, les types, les valeurs manquantes et les doublons.",
      cleaning: "Appliquer les règles déterministes approuvées et recontrôler la qualité.",
      quality: "Rendre visibles les alertes et les lignes mises en quarantaine.",
      persistence: "Stocker le jeu nettoyé dans l’adaptateur configuré.",
      analytics: "Actualiser les analyses approuvées sans inventer de résultats.",
      ready: "Renvoyer le résultat structuré du traitement.",
    },
    connected: "Service de traitement connecté",
    unavailable: "Service de traitement indisponible",
    checking: "Vérification du service de traitement",
    chooseFiles: "Choisir des fichiers CSV",
    chooseFilesNote: "CSV UTF-8 · colonnes analytiques normalisées · 10 Mo maximum par fichier",
    browse: "Parcourir",
    datasetType: "Type de données",
    autoDetect: "Détection depuis le schéma",
    transactions: "Transactions",
    orders: "Commandes",
    customers: "Clients",
    catalogue: "Catalogue",
    selectedFiles: "Fichiers sélectionnés",
    noFiles: "Aucun CSV sélectionné.",
    remove: "Retirer",
    start: "Lancer le traitement",
    starting: "Import…",
    retry: "Réessayer",
    reset: "Traiter un autre fichier",
    currentStage: "Étape actuelle",
    resultReady: "Résultat du traitement prêt",
    resultDescription:
      "Le profilage, le nettoyage, les contrôles qualité, la persistance et l’actualisation analytique sont terminés.",
    openDashboard: "Ouvrir le tableau de bord",
    dashboardNote: "Le tableau de bord lit les agrégats de ce traitement ; la prévision reste explicitement en attente.",
    files: "Fichiers",
    rawRows: "Lignes brutes",
    cleanedRows: "Lignes nettoyées",
    rowsRemoved: "Lignes supprimées",
    missingValues: "Valeurs manquantes après nettoyage",
    missingBeforeAfter: "Valeurs manquantes",
    duplicatesRemoved: "Doublons exacts supprimés",
    profile: "Profil des données",
    schemaValid: "Schéma requis valide",
    columns: "Colonnes",
    size: "Taille du fichier",
    rawDuplicates: "Doublons bruts",
    columnName: "Colonne",
    inferredType: "Type détecté",
    populated: "Renseignées",
    missing: "Manquantes",
    unique: "Uniques",
    issues: "Problèmes de qualité",
    noIssues: "Aucun problème détecté après le nettoyage approuvé.",
    cleaning: "Résultat du nettoyage",
    before: "Avant",
    after: "Après",
    appliedChanges: "Changements appliqués",
    noChanges: "Les règles approuvées ont été évaluées ; ce fichier ne nécessitait aucun changement.",
    rows: "Lignes",
    affectedRows: "lignes concernées",
    affectedCells: "cellules concernées",
    rawPreview: "Aperçu brut",
    cleanedPreview: "Aperçu nettoyé",
    previewNotice: "Cinq premières lignes uniquement. Ces valeurs ne sont pas envoyées à l’assistant IA.",
    deferred: "Règles volontairement différées",
    deferredNote: "Ces décisions exigent une validation métier, statistique ou de base de données.",
    analyticsBoundary: "Frontière d’intégration analytique",
    analyticsBoundaryNote:
      "Les analyses déterministes approuvées sont disponibles dans le tableau de bord. La prévision et le risque client restent à décider.",
    persistence: "Persistance",
    inMemory: "Instantané en mémoire de développement",
    postgres: "Instantané PostgreSQL",
    lastUpdated: "Terminé",
    errorTitle: "Le traitement n’a pas pu démarrer",
    clientFileError: "Seuls les fichiers CSV UTF-8 de 10 Mo maximum sont acceptés.",
    details: "Détails de validation",
    localRows: "lignes détectées localement",
  },
};

function PreviewTable({ preview, text }) {
  const columns = preview?.columns || preview?.headers || [];
  const rows = preview?.rows || [];
  if (!columns.length) return null;

  return (
    <div className="upload-preview-table-wrap">
      <table className="upload-preview-table">
        <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((column, columnIndex) => (
                <td key={`${column}-${columnIndex}`}>{row[columnIndex] || "—"}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="upload-preview-caption">{text.previewNotice}</p>
    </div>
  );
}

function FileResultCard({ file, language, text }) {
  const [previewMode, setPreviewMode] = useState("raw");
  const preview = previewMode === "raw"
    ? file.profile.raw_preview
    : file.cleaning.cleaned_preview;

  return (
    <article className="pipeline-file-result">
      <div className="pipeline-file-heading">
        <div>
          <span>{file.dataset}</span>
          <h3>{file.filename}</h3>
        </div>
        <StatusBadge status={file.quality.status === "passed" ? "completed" : "warning"}>
          {file.quality.status === "passed" ? text.resultReady : text.issues}
        </StatusBadge>
      </div>

      <section className="profile-section">
        <div className="pipeline-section-heading">
          <div><span>01</span><h4>{text.profile}</h4></div>
          <span className="schema-valid"><Check size={14} />{text.schemaValid}</span>
        </div>
        <div className="profile-stat-grid">
          <div><span>{text.rawRows}</span><strong>{formatNumber(file.profile.row_count, language)}</strong></div>
          <div><span>{text.columns}</span><strong>{formatNumber(file.profile.column_count, language)}</strong></div>
          <div><span>{text.size}</span><strong>{formatFileSize(file.profile.file_size_bytes, language)}</strong></div>
          <div><span>{text.rawDuplicates}</span><strong>{formatNumber(file.profile.duplicate_rows, language)}</strong></div>
        </div>

        <div className="profile-schema-table-wrap">
          <table className="profile-schema-table">
            <thead><tr><th>{text.columnName}</th><th>{text.inferredType}</th><th>{text.populated}</th><th>{text.missing}</th><th>{text.unique}</th></tr></thead>
            <tbody>
              {file.profile.columns.map((column) => (
                <tr key={column.name}>
                  <td>{column.name}</td>
                  <td><span className="type-chip">{column.inferred_type}</span></td>
                  <td>{formatNumber(column.non_null_count, language)}</td>
                  <td>{formatNumber(column.missing_count, language)}</td>
                  <td>{formatNumber(column.unique_count, language)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="cleaning-section">
        <div className="pipeline-section-heading">
          <div><span>02</span><h4>{text.cleaning}</h4></div>
        </div>
        <div className="before-after-grid">
          <div><span>{text.before}</span><strong>{formatNumber(file.cleaning.before_rows, language)}</strong><small>{text.rows}</small></div>
          <ArrowRight size={20} aria-hidden="true" />
          <div><span>{text.after}</span><strong>{formatNumber(file.cleaning.after_rows, language)}</strong><small>{text.rows}</small></div>
        </div>

        <h5>{text.appliedChanges}</h5>
        {file.cleaning.transformations.length ? (
          <ul className="transformation-list">
            {file.cleaning.transformations.map((item) => (
              <li key={item.code}>
                <span className="transformation-check"><Check size={14} /></span>
                <div><strong>{item.label}</strong><p>{item.description}</p></div>
                <small>{formatNumber(item.affected_rows, language)} {text.affectedRows} · {formatNumber(item.affected_cells, language)} {text.affectedCells}</small>
              </li>
            ))}
          </ul>
        ) : <p className="pipeline-calm-state">{text.noChanges}</p>}
        <div className="cleaning-quality-delta"><span>{text.missingBeforeAfter}</span><strong>{formatNumber(file.cleaning.missing_before, language)} → {formatNumber(file.cleaning.missing_after, language)}</strong></div>
      </section>

      <section className="quality-section">
        <div className="pipeline-section-heading">
          <div><span>03</span><h4>{text.issues}</h4></div>
        </div>
        {file.quality.issues.length ? (
          <ul className="quality-issue-list">
            {file.quality.issues.map((issue) => (
              <li key={issue.code}>
                <AlertTriangle size={16} aria-hidden="true" />
                <div><strong>{issue.message}</strong><small>{formatNumber(issue.count, language)} · {issue.columns.join(", ") || "—"}</small></div>
              </li>
            ))}
          </ul>
        ) : <p className="pipeline-calm-state is-success"><Check size={15} />{text.noIssues}</p>}
      </section>

      <section className="result-preview-section">
        <div className="upload-preview-tabs" role="tablist" aria-label={text.rawPreview}>
          <button type="button" role="tab" aria-selected={previewMode === "raw"} onClick={() => setPreviewMode("raw")}>{text.rawPreview}</button>
          <button type="button" role="tab" aria-selected={previewMode === "clean"} onClick={() => setPreviewMode("clean")}>{text.cleanedPreview}</button>
        </div>
        <PreviewTable preview={preview} text={text} />
      </section>

      <details className="deferred-rules">
        <summary>{text.deferred}</summary>
        <p>{text.deferredNote}</p>
        <ul>{file.cleaning.deferred_rules.map((rule) => <li key={rule}>{rule.replaceAll("_", " ")}</li>)}</ul>
      </details>
    </article>
  );
}

function DataUpload({ language = "en", onPipelineComplete, onNavigate }) {
  const text = translations[language] || translations.en;
  const [files, setFiles] = useState([]);
  const [datasetType, setDatasetType] = useState("");
  const [clientRejections, setClientRejections] = useState([]);
  const [localPreviews, setLocalPreviews] = useState({});
  const [run, setRun] = useState(null);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiStatus, setApiStatus] = useState("checking");

  const isTerminal = run?.status === "completed" || run?.status === "failed";

  useEffect(() => {
    const controller = new AbortController();
    getApiHealth({ signal: controller.signal })
      .then(() => setApiStatus("connected"))
      .catch(() => setApiStatus("unavailable"));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!run?.run_id || isTerminal) return undefined;
    let cancelled = false;
    const poll = async () => {
      try {
        const nextRun = await getPipelineRun(run.run_id);
        if (!cancelled) {
          setRun(nextRun);
          if (nextRun.status === "completed") onPipelineComplete?.(nextRun);
        }
      } catch (pollError) {
        if (!cancelled && pollError.name !== "AbortError") setError(pollError);
      }
    };
    const interval = window.setInterval(poll, 700);
    poll();
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [isTerminal, onPipelineComplete, run?.run_id]);

  const currentStage = run?.stage || "upload";
  const qualityTotals = useMemo(() => ({
    missing: run?.result?.total_missing_values_after ?? run?.result?.total_missing_values ?? 0,
    duplicates: run?.result?.total_duplicate_rows_removed || 0,
  }), [run?.result]);

  const processSelectedFiles = async (fileList) => {
    const selected = Array.from(fileList || []);
    const accepted = selected.filter((file) => file.name.toLowerCase().endsWith(".csv") && file.size <= MAX_FILE_SIZE_BYTES);
    setFiles(accepted);
    setClientRejections(selected.filter((file) => !accepted.includes(file)).map((file) => file.name));
    setRun(null);
    setError(null);
    const previews = await Promise.all(accepted.map(async (file) => {
      try {
        return [file.name, { ...parseCsvPreview(await file.text()), size: file.size }];
      } catch {
        return [file.name, { size: file.size }];
      }
    }));
    setLocalPreviews(Object.fromEntries(previews));
  };

  const handleFileSelection = async (event) => {
    await processSelectedFiles(event.target.files);
    event.target.value = "";
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    await processSelectedFiles(event.dataTransfer.files);
  };

  const removeFile = (filename) => {
    setFiles((current) => current.filter((file) => file.name !== filename));
    setLocalPreviews((current) => {
      const next = { ...current };
      delete next[filename];
      return next;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!files.length || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const acceptedRun = await uploadPipelineRun(files, {
        datasetType: files.length === 1 ? datasetType || undefined : undefined,
      });
      setRun(acceptedRun);
      setApiStatus("connected");
      onPipelineComplete?.(acceptedRun);
    } catch (uploadError) {
      setError(uploadError);
      if (uploadError.code === "network_error") setApiStatus("unavailable");
    } finally {
      setIsSubmitting(false);
    }
  };

  const reset = () => {
    setFiles([]);
    setLocalPreviews({});
    setClientRejections([]);
    setDatasetType("");
    setRun(null);
    setError(null);
  };

  const runError = run?.error;
  const currentError = error || (runError ? new ApiClientError(runError.message, runError) : null);

  return (
    <section className="page-shell upload-page">
      <ScrollReveal>
        <header className="upload-page-header">
          <div>
            <p className="section-eyebrow">{text.eyebrow}</p>
            <h2>{text.title}</h2>
            <p>{text.description}</p>
          </div>
          <span className={`api-connection api-connection--${apiStatus}`}>
            <i aria-hidden="true" />
            {text[apiStatus]}
          </span>
        </header>
      </ScrollReveal>

      <ScrollReveal delay={60}>
        <ol className="pipeline-stepper" aria-label={text.currentStage}>
          {PIPELINE_STEPS.map((step, index) => {
            const state = userStepState(run, step);
            return (
              <li key={step.key} data-state={state} aria-current={userStageFor(currentStage) === step.key ? "step" : undefined}>
                <span>{state === "completed" ? <Check size={15} /> : index + 1}</span>
                <div><strong>{text.userStages[step.key]}</strong><small>{text.userStageDescriptions[step.key]}</small></div>
              </li>
            );
          })}
        </ol>
      </ScrollReveal>

      {(!run || run.status === "failed") && (
        <ScrollReveal delay={100}>
          <form className="upload-workbench" onSubmit={handleSubmit}>
            <label className="upload-dropzone" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
              <UploadCloud size={30} strokeWidth={1.6} aria-hidden="true" />
              <strong>{text.chooseFiles}</strong>
              <span>{text.chooseFilesNote}</span>
              <span className="button button--primary">{text.browse}</span>
              <input type="file" accept=".csv,text/csv" multiple onChange={handleFileSelection} />
            </label>

            <div className="upload-control-panel">
              <label>
                <span>{text.datasetType}</span>
                <select value={datasetType} onChange={(event) => setDatasetType(event.target.value)} disabled={files.length > 1}>
                  <option value="">{text.autoDetect}</option>
                  <option value="transactions">{text.transactions}</option>
                  <option value="orders">{text.orders}</option>
                  <option value="customers">{text.customers}</option>
                  <option value="catalogue">{text.catalogue}</option>
                </select>
              </label>
              <div className="selected-file-list">
                <span>{text.selectedFiles}</span>
                {!files.length && <p>{text.noFiles}</p>}
                {files.map((file) => (
                  <div key={file.name}>
                    <FileText size={17} aria-hidden="true" />
                    <span><strong>{file.name}</strong><small>{formatFileSize(file.size, language)} · {formatNumber(localPreviews[file.name]?.rowCount || 0, language)} {text.localRows}</small></span>
                    <button type="button" onClick={() => removeFile(file.name)} aria-label={`${text.remove} ${file.name}`}><X size={16} /></button>
                  </div>
                ))}
              </div>
              <button className="button button--primary upload-submit" type="submit" disabled={!files.length || isSubmitting}>
                {isSubmitting ? <RefreshCw className="spin" size={17} /> : <ArrowRight size={17} />}
                {isSubmitting ? text.starting : text.start}
              </button>
            </div>

            {clientRejections.length > 0 && (
              <div className="upload-inline-error"><AlertTriangle size={17} /><span>{text.clientFileError} {clientRejections.join(", ")}</span></div>
            )}
            {currentError && (
              <div className="upload-error-panel" role="alert">
                <AlertTriangle size={20} />
                <div><strong>{text.errorTitle}</strong><p>{currentError.message}</p>
                  {currentError.details?.length > 0 && <details><summary>{text.details}</summary><ul>{currentError.details.map((detail, index) => <li key={`${detail.code}-${index}`}>{detail.message} {detail.columns?.join(", ")}</li>)}</ul></details>}
                </div>
                <button type="submit" className="button button--secondary">{text.retry}</button>
              </div>
            )}
          </form>
        </ScrollReveal>
      )}

      {run && !run.result && !currentError && (
        <ScrollReveal delay={120}>
          <section className="pipeline-live-state" aria-live="polite">
            <span className="pipeline-live-icon"><RefreshCw className="spin" size={20} /></span>
            <div><span>{text.currentStage}</span><strong>{text.userStages[userStageFor(currentStage)]}</strong><p>{run.message}</p></div>
          </section>
        </ScrollReveal>
      )}

      {run?.result && (
        <ScrollReveal delay={120}>
          <section className="pipeline-result-shell" aria-live="polite">
            <header className="pipeline-ready-header">
              <div><span className="ready-check"><Check size={20} /></span><div><p className="section-eyebrow">{text.resultReady}</p><h2>{text.resultReady}</h2><p>{text.resultDescription}</p></div></div>
              <button type="button" className="button button--primary" onClick={() => onNavigate?.("overview")}>
                {text.openDashboard}<ArrowRight size={17} />
              </button>
            </header>
            <p className="dashboard-truth-note">{text.dashboardNote}</p>

            <div className="pipeline-result-summary">
              <div><span>{text.files}</span><strong>{formatNumber(run.result.total_files, language)}</strong></div>
              <div><span>{text.rawRows}</span><strong>{formatNumber(run.result.total_rows_raw, language)}</strong></div>
              <div><span>{text.cleanedRows}</span><strong>{formatNumber(run.result.total_rows_cleaned, language)}</strong></div>
              <div><span>{text.duplicatesRemoved}</span><strong>{formatNumber(qualityTotals.duplicates, language)}</strong></div>
              <div><span>{text.missingValues}</span><strong>{formatNumber(qualityTotals.missing, language)}</strong></div>
            </div>

            <div className="pipeline-file-results">
              {run.result.files.map((file) => <FileResultCard key={file.filename} file={file} language={language} text={text} />)}
            </div>

            <section className="analytics-boundary-card">
              <div><span>04</span><div><h3>{text.analyticsBoundary}</h3><p>{text.analyticsBoundaryNote}</p></div></div>
              <dl><div><dt>{text.persistence}</dt><dd>{run.result.persistence === "postgres" ? text.postgres : text.inMemory}</dd></div><div><dt>{text.lastUpdated}</dt><dd>{formatDateTime(run.result.completed_at, language)}</dd></div></dl>
            </section>

            <button type="button" className="button button--secondary pipeline-reset" onClick={reset}>
              <RefreshCw size={16} />{text.reset}
            </button>
          </section>
        </ScrollReveal>
      )}
    </section>
  );
}

export default DataUpload;
