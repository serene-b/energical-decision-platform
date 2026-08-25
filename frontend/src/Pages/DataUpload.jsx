import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  Database,
  Download,
  FileText,
  Plus,
  RefreshCw,
  UploadCloud,
  X,
} from "lucide-react";

import {
  ApiClientError,
  downloadAllCleanedDatasets,
  downloadCleanedDataset,
  downloadPreparationReport,
  getApiHealth,
  getRecentPreparationRuns,
  getPipelineRun,
  uploadPipelineRun,
} from "../api/pipeline.js";
import ScrollReveal from "../components/Common/ScrollReveal.jsx";
import { formatDateOnly, formatDateTime, formatFileSize, formatNumber } from "../utils/formatters.js";
import { detectDatasetFromHeaders, parseCsvPreview, SUPPORTED_DATASETS } from "../utils/csvPreview.js";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const PIPELINE_STEPS = [
  { key: "upload", technical: ["upload", "validation"] },
  { key: "profile", technical: ["profiling"] },
  { key: "clean", technical: ["cleaning"] },
  { key: "analyze", technical: ["quality", "persistence", "analytics"] },
  { key: "generate", technical: ["ready"] },
];

const DATASET_LABELS = {
  transactions: "Transactions",
  orders: "Orders",
  customers: "Customers",
  catalogue: "Catalogue",
};

function userStageFor(technicalStage) {
  return PIPELINE_STEPS.find((step) => step.technical.includes(technicalStage))?.key || "upload";
}

function userStepState(run, step, reportGenerated = false) {
  if (step.key === "generate") {
    if (reportGenerated) return "completed";
    return run?.result ? "active" : "pending";
  }
  if (!run) return step.key === "upload" ? "active" : "pending";
  const statuses = step.technical.map((key) => run.stages?.find((stage) => stage.key === key)?.status || "pending");
  if (statuses.includes("failed")) return "failed";
  if (statuses.every((status) => status === "completed")) return "completed";
  if (statuses.includes("running") || statuses.includes("completed")) return "active";
  return "pending";
}

const translations = {
  en: {
    title: "Data Upload",
    description: "Select and process one or more supported CSV datasets.",
    userStages: { upload: "Upload", profile: "Profile", clean: "Clean", analyze: "Analyze", generate: "Generate" },
    userStageDescriptions: {
      upload: "Select and validate a batch.",
      profile: "Inspect raw data before cleaning.",
      clean: "Review deterministic changes.",
      analyze: "Check data quality and readiness.",
      generate: "Create the preparation report.",
    },
    connected: "Processing service connected",
    unavailable: "Processing service unavailable",
    checking: "Checking processing service",
    chooseFiles: "Drop CSV files here",
    chooseFilesNote: "or select one or multiple UTF-8 CSV files, up to 10 MB each",
    browse: "Select files",
    addFiles: "Add files",
    selectedFiles: "Selected files",
    noFiles: "No CSV files selected yet.",
    clearBatch: "Clear batch",
    file: "File",
    dataset: "Dataset",
    rows: "Rows",
    status: "Status",
    actions: "Actions",
    detected: "Detected",
    identified: "Identified",
    needsIdentification: "Needs identification",
    inspecting: "Inspecting",
    rejected: "Rejected",
    readyToProcess: "Ready to process",
    validationReview: "Review file",
    chooseDataset: "Choose dataset",
    replace: "Replace",
    remove: "Remove",
    processFiles: "Process files",
    processing: "Processing",
    clientFileError: "Rejected files are not sent. CSV files must be UTF-8 encoded and no larger than 10 MB.",
    currentStage: "Current stage",
    errorTitle: "Processing could not complete",
    details: "Validation details",
    retry: "Retry",
    resultReady: "Data preparation complete",
    resultDescription: "The batch was profiled, cleaned, checked for readiness, and stored using the configured persistence adapter.",
    preparationComplete: "Preparation complete",
    preparationDescription: "The current batch is ready. Counts below are from this processing run.",
    transactions: "Transactions",
    orders: "Orders",
    customers: "Customers",
    catalogue: "Catalogue",
    datasetsProcessed: "Datasets processed",
    files: "Files processed",
    rawRows: "Rows received",
    cleanedRows: "Rows retained",
    rowsRemoved: "Rows removed",
    retention: "Retention",
    retentionFormula: "retained / received",
    removedFormula: "removed / received",
    beforeAfterSnapshot: "Before / after quality snapshot",
    qualitySnapshotNote: "Only metrics tracked by the preparation backend are shown.",
    qualityMetric: "Metric",
    missingCells: "Missing cells",
    duplicateRows: "Duplicate rows",
    rejectedRows: "Rejected rows",
    notTracked: "Not tracked",
    datasetSummary: "Dataset summary",
    datasetSummaryNote: "Each row is scoped to the current preparation run.",
    received: "Received",
    retained: "Retained",
    removed: "Removed",
    retentionPercent: "Retention",
    cleanedPreviewDescription: "First 10 cleaned rows from this run. Horizontal scroll is available for wide datasets.",
    viewDetails: "View details",
    downloadCleanedData: "Download cleaned data",
    downloadDataset: "Dataset",
    downloadSelectedCsv: "Download {dataset} CSV",
    downloadAllCleaned: "Download all cleaned CSVs",
    downloadDescription: "Files are generated from the cleaned data in this run.",
    selectedDownloadError: "Selected cleaned dataset download failed",
    allDownloadError: "Download all cleaned datasets failed",
    downloadPdfReport: "Download PDF report",
    databaseUpdated: "Database updated automatically",
    databaseSummary: "The processed batch was written to the configured database.",
    persistenceUpdated: "Persistence updated automatically",
    persistenceSummary: "The processed batch was saved to the configured persistence adapter.",
    databaseUnavailable: "Database result unavailable",
    newRecords: "New records",
    updatedRecords: "Existing records updated",
    unchangedRecords: "Unchanged records",
    rejectedRecords: "Rejected records",
    transactionAccounting: "Transaction row accounting",
    newTransactionOrders: "new orders accepted",
    newTransactionRows: "new transaction rows inserted",
    existingTransactionOrdersSkipped: "existing orders skipped",
    transactionReviewOrders: "orders requiring review",
    transactionReviewRows: "transaction rows in review",
    warningCount: "Warnings",
    recentRuns: "Recent preparation runs",
    recentRunsNote: "Completed runs returned by the preparation service.",
    noRecentRuns: "No completed preparation runs in this session.",
    completedOn: "Completed",
    duplicatesRemoved: "Exact duplicates removed",
    missingValues: "Missing cells after cleaning",
    warnings: "Warnings",
    unresolvedIssues: "Unresolved issues",
    profile: "Profile",
    beforeCleaning: "Before cleaning",
    schemaValid: "Supported schema",
    columns: "Columns",
    size: "File size",
    rawDuplicates: "Duplicate rows",
    missing: "Missing",
    columnName: "Column",
    inferredType: "Type",
    populated: "Populated",
    unique: "Unique",
    dateCoverage: "Date coverage",
    notAvailable: "Not available in this dataset",
    cleaning: "Cleaning",
    cleaningSummary: "Cleaning summary",
    before: "Before",
    after: "After",
    change: "Change",
    appliedChanges: "Recorded actions",
    affectedRows: "affected rows",
    affectedCells: "affected cells",
    noChanges: "No deterministic transformation was recorded for this file.",
    qualityIssues: "Remaining quality issues",
    noIssues: "No remaining quality issues were reported.",
    rawPreview: "Raw preview",
    cleanedPreview: "Cleaned preview",
    previewNotice: "First 10 cleaned rows from this run. Genuine personal fields are redacted; internal dataset IDs remain visible.",
    rawPreviewNotice: "Raw preview from the received file. Genuine personal fields are redacted; internal dataset IDs remain visible.",
    deferred: "Deferred rules",
    deferredNote: "These rules remain visible because they require business, statistical, or database confirmation.",
    readiness: "Data readiness",
    readinessNote: "Analyze reports quality and readiness only. Business analytics and notebooks are not executed here.",
    ready: "Ready",
    readyWithWarnings: "Ready with warnings",
    needsAttention: "Needs attention",
    readinessReason: "Reason",
    generateReport: "Generate report",
    generatingReport: "Generating report",
    downloadPdf: "Download PDF",
    reportReady: "PDF report ready",
    reportDescription: "The backend report contains the batch profile, actual cleaning actions, quality findings, and readiness status.",
    reportError: "Report generation failed",
    persistence: "Persistence",
    inMemory: "Development memory snapshot",
    postgres: "PostgreSQL snapshot",
    completed: "Completed",
    processAnotherBatch: "Process another batch",
  },
  fr: {
    title: "Data Upload",
    description: "Selectionnez et traitez un ou plusieurs jeux de donnees CSV pris en charge.",
    userStages: { upload: "Import", profile: "Profil", clean: "Nettoyage", analyze: "Analyse", generate: "Rapport" },
    userStageDescriptions: {
      upload: "Selectionner et valider un lot.",
      profile: "Inspecter les donnees brutes.",
      clean: "Verifier les changements deterministes.",
      analyze: "Verifier la qualite et la preparation.",
      generate: "Creer le rapport de preparation.",
    },
    connected: "Service de traitement connecte",
    unavailable: "Service de traitement indisponible",
    checking: "Verification du service de traitement",
    chooseFiles: "Deposez les fichiers CSV ici",
    chooseFilesNote: "ou selectionnez un ou plusieurs CSV UTF-8, 10 Mo maximum chacun",
    browse: "Selectionner des fichiers",
    addFiles: "Ajouter des fichiers",
    selectedFiles: "Fichiers selectionnes",
    noFiles: "Aucun fichier CSV selectionne.",
    clearBatch: "Vider le lot",
    file: "Fichier",
    dataset: "Jeu de donnees",
    rows: "Lignes",
    status: "Statut",
    actions: "Actions",
    detected: "Detecte",
    identified: "Identifie",
    needsIdentification: "Identification requise",
    inspecting: "Inspection",
    rejected: "Rejete",
    readyToProcess: "Pret a traiter",
    validationReview: "Verifier le fichier",
    chooseDataset: "Choisir le jeu de donnees",
    replace: "Remplacer",
    remove: "Retirer",
    processFiles: "Traiter les fichiers",
    processing: "Traitement",
    clientFileError: "Les fichiers rejetes ne sont pas envoyes. CSV UTF-8 de 10 Mo maximum.",
    currentStage: "Etape actuelle",
    errorTitle: "Le traitement n'a pas pu aboutir",
    details: "Details de validation",
    retry: "Reessayer",
    resultReady: "Preparation des donnees terminee",
    resultDescription: "Le lot a ete profile, nettoye, controle pour sa preparation, puis stocke avec l'adaptateur configure.",
    preparationComplete: "Preparation terminee",
    preparationDescription: "Le lot actuel est pret. Les compteurs ci-dessous proviennent de ce traitement.",
    transactions: "Transactions",
    orders: "Commandes",
    customers: "Clients",
    catalogue: "Catalogue",
    datasetsProcessed: "Jeux de donnees traites",
    files: "Fichiers traites",
    rawRows: "Lignes recues",
    cleanedRows: "Lignes conservees",
    rowsRemoved: "Lignes retirees",
    retention: "Conservation",
    retentionFormula: "conservees / recues",
    removedFormula: "retirees / recues",
    beforeAfterSnapshot: "Qualite avant / apres",
    qualitySnapshotNote: "Seuls les indicateurs suivis par le backend de preparation sont affiches.",
    qualityMetric: "Indicateur",
    missingCells: "Cellules manquantes",
    duplicateRows: "Doublons",
    rejectedRows: "Lignes rejetees",
    notTracked: "Non suivi",
    datasetSummary: "Synthese par jeu de donnees",
    datasetSummaryNote: "Chaque ligne correspond au lot de preparation actuel.",
    received: "Recues",
    retained: "Conservees",
    removed: "Retirees",
    retentionPercent: "Conservation",
    cleanedPreviewDescription: "10 premieres lignes nettoyees du lot actuel. Defilement horizontal disponible pour les jeux larges.",
    viewDetails: "Voir les details",
    downloadCleanedData: "Telecharger les donnees nettoyees",
    downloadDataset: "Jeu de donnees",
    downloadSelectedCsv: "Telecharger le CSV {dataset}",
    downloadAllCleaned: "Telecharger tous les CSV nettoyes",
    downloadDescription: "Les fichiers sont generes a partir des donnees nettoyees de ce lot.",
    selectedDownloadError: "Echec du telechargement du jeu de donnees nettoye selectionne",
    allDownloadError: "Echec du telechargement de tous les jeux de donnees nettoyes",
    downloadPdfReport: "Telecharger le rapport PDF",
    databaseUpdated: "Base de donnees mise a jour automatiquement",
    databaseSummary: "Le lot traite a ete ecrit dans la base de donnees configuree.",
    persistenceUpdated: "Persistance mise a jour automatiquement",
    persistenceSummary: "Le lot traite a ete enregistre avec l'adaptateur de persistance configure.",
    databaseUnavailable: "Resultat de base indisponible",
    newRecords: "Nouveaux enregistrements",
    updatedRecords: "Enregistrements existants mis a jour",
    unchangedRecords: "Enregistrements inchanges",
    rejectedRecords: "Enregistrements rejetes",
    transactionAccounting: "Comptage des lignes de transaction",
    newTransactionOrders: "nouvelles commandes acceptees",
    newTransactionRows: "nouvelles lignes de transaction inserees",
    existingTransactionOrdersSkipped: "commandes existantes ignorees",
    transactionReviewOrders: "commandes a verifier",
    transactionReviewRows: "lignes de transaction a verifier",
    warningCount: "Alertes",
    recentRuns: "Preparations recentes",
    recentRunsNote: "Lots termines renvoyes par le service de preparation.",
    noRecentRuns: "Aucune preparation terminee dans cette session.",
    completedOn: "Terminee",
    duplicatesRemoved: "Doublons exacts retires",
    missingValues: "Cellules manquantes apres nettoyage",
    warnings: "Alertes",
    unresolvedIssues: "Problemes non resolus",
    profile: "Profil",
    beforeCleaning: "Avant nettoyage",
    schemaValid: "Schema pris en charge",
    columns: "Colonnes",
    size: "Taille du fichier",
    rawDuplicates: "Lignes dupliquees",
    missing: "Manquantes",
    columnName: "Colonne",
    inferredType: "Type",
    populated: "Renseignees",
    unique: "Uniques",
    dateCoverage: "Periode des dates",
    notAvailable: "Non disponible pour ce jeu de donnees",
    cleaning: "Nettoyage",
    cleaningSummary: "Synthese du nettoyage",
    before: "Avant",
    after: "Apres",
    change: "Variation",
    appliedChanges: "Actions enregistrees",
    affectedRows: "lignes concernees",
    affectedCells: "cellules concernees",
    noChanges: "Aucune transformation deterministe n'a ete enregistree pour ce fichier.",
    qualityIssues: "Problemes de qualite restants",
    noIssues: "Aucun probleme de qualite restant n'a ete signale.",
    rawPreview: "Apercu brut",
    cleanedPreview: "Apercu nettoye",
    previewNotice: "10 premieres lignes nettoyees du lot actuel. Les donnees personnelles reelles sont masquees; les identifiants internes restent visibles.",
    rawPreviewNotice: "Apercu brut du fichier recu. Les donnees personnelles reelles sont masquees; les identifiants internes restent visibles.",
    deferred: "Regles differees",
    deferredNote: "Ces regles restent visibles car elles exigent une confirmation metier, statistique ou base de donnees.",
    readiness: "Preparation des donnees",
    readinessNote: "Analyse signifie ici qualite et preparation uniquement. Les analyses metier et notebooks ne sont pas executes ici.",
    ready: "Pret",
    readyWithWarnings: "Pret avec alertes",
    needsAttention: "Attention requise",
    readinessReason: "Motif",
    generateReport: "Generer le rapport",
    generatingReport: "Generation du rapport",
    downloadPdf: "Telecharger le PDF",
    reportReady: "Rapport PDF pret",
    reportDescription: "Le rapport backend contient le profil du lot, les actions de nettoyage reelles, les constats qualite et le statut de preparation.",
    reportError: "Echec de generation du rapport",
    persistence: "Persistance",
    inMemory: "Instantane memoire de developpement",
    postgres: "Instantane PostgreSQL",
    completed: "Termine",
    processAnotherBatch: "Traiter un autre lot",
  },
};

function datasetLabel(dataset, text) {
  return text[dataset] || DATASET_LABELS[dataset] || dataset || text.needsIdentification;
}

function fileKey(file) {
  return `${file.name}::${file.size}::${file.lastModified || 0}`;
}

function formatChange(value, language) {
  if (value === null || value === undefined) return "-";
  if (value > 0) return `+${formatNumber(value, language)}`;
  return formatNumber(value, language);
}

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function percentage(part, total) {
  if (!total) return null;
  return `${((part / total) * 100).toFixed(1)}%`;
}

function dateRangeFor(file) {
  return file?.cleaning?.date_ranges?.order_date || file?.profile?.date_ranges?.order_date || null;
}

function dateCoverageFor(files) {
  for (const dataset of ["transactions", "orders"]) {
    const file = files.find((item) => item.dataset === dataset);
    const range = dateRangeFor(file);
    if (range?.min && range?.max) return { dataset, ...range };
  }
  return null;
}

function preparationMetrics(result) {
  const files = result?.files || [];
  const received = asNumber(result?.total_rows_raw);
  const retained = asNumber(result?.total_rows_cleaned);
  const rawMissing = files.reduce((total, file) => total + Object.values(file.profile?.missing_values || {}).reduce((sum, value) => sum + asNumber(value), 0), 0);
  const cleanedMissing = files.reduce((total, file) => total + asNumber(file.cleaning?.missing_after), 0);
  const rawDuplicates = files.reduce((total, file) => total + asNumber(file.profile?.duplicate_rows), 0);
  const cleanedDuplicates = files.reduce((total, file) => total + asNumber(file.cleaning?.duplicate_rows_after), 0);
  const rejected = files.reduce((total, file) => total + asNumber(file.cleaning?.rejected_rows), 0);
  return {
    received,
    retained,
    removed: Math.max(0, received - retained),
    rawMissing,
    cleanedMissing,
    rawDuplicates,
    cleanedDuplicates,
    rejected,
  };
}

function snapshotValue(value, language, text) {
  return value === null || value === undefined ? text.notTracked : formatNumber(value, language);
}

function readinessLabel(status, text) {
  if (status === "ready") return text.ready;
  if (status === "ready_with_warnings") return text.readyWithWarnings;
  return text.needsAttention;
}

function readinessClass(status) {
  if (status === "ready") return "is-ready";
  if (status === "ready_with_warnings") return "is-warning";
  return "is-error";
}

function StatusChip({ status, children }) {
  return <span className={`data-status-chip ${readinessClass(status)}`}>{children}</span>;
}

function PreviewTable({ preview, text, notice }) {
  const columns = preview?.columns || [];
  const rows = preview?.rows || [];
  if (!columns.length) return <p className="pipeline-calm-state">{text.notAvailable}</p>;

  return (
    <div className="upload-preview-table-wrap">
      <table className="upload-preview-table">
        <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
                {columns.map((column, columnIndex) => {
                  const value = row[columnIndex];
                  const displayValue = value === null || value === undefined || value === "" ? "-" : String(value);
                  return <td key={`${column}-${columnIndex}`} title={displayValue}>{displayValue}</td>;
                })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="upload-preview-caption">{notice || text.previewNotice}</p>
    </div>
  );
}

function FileResultPanel({ file, language, text }) {
  const [previewMode, setPreviewMode] = useState("raw");
  const rawMissing = Object.values(file.profile.missing_values || {}).reduce((total, value) => total + value, 0);
  const preview = previewMode === "raw" ? file.profile.raw_preview : file.cleaning.cleaned_preview;
  const comparisons = [
    { label: text.rows, before: file.cleaning.before_rows, after: file.cleaning.after_rows },
    { label: text.missingValues, before: file.cleaning.missing_before, after: file.cleaning.missing_after },
    { label: text.duplicateRows, before: file.profile.duplicate_rows, after: file.cleaning.duplicate_rows_after },
  ];

  return (
    <article className="pipeline-file-result">
      <div className="pipeline-file-heading">
        <div><span>{datasetLabel(file.dataset, text)}</span><h3>{file.filename}</h3></div>
        <StatusChip status={file.readiness}>{readinessLabel(file.readiness, text)}</StatusChip>
      </div>

      <section className="profile-section">
        <div className="pipeline-section-heading">
          <div><span>01</span><h4>{text.profile}</h4></div>
          <span className="schema-valid"><Check size={14} />{text.schemaValid}</span>
        </div>
        <p className="stage-kicker">{text.beforeCleaning}</p>
        <div className="profile-stat-grid">
          <div><span>{text.rawRows}</span><strong>{formatNumber(file.profile.row_count, language)}</strong></div>
          <div><span>{text.columns}</span><strong>{formatNumber(file.profile.column_count, language)}</strong></div>
          <div><span>{text.missing}</span><strong>{formatNumber(rawMissing, language)}</strong></div>
          <div><span>{text.rawDuplicates}</span><strong>{formatNumber(file.profile.duplicate_rows, language)}</strong></div>
        </div>
        <div className="profile-meta-line"><span>{text.size}</span><strong>{formatFileSize(file.profile.file_size_bytes, language)}</strong></div>
        <div className="profile-schema-table-wrap">
          <table className="profile-schema-table">
            <thead><tr><th>{text.columnName}</th><th>{text.inferredType}</th><th>{text.populated}</th><th>{text.missing}</th><th>{text.unique}</th></tr></thead>
            <tbody>{file.profile.columns.map((column) => (
              <tr key={column.name}>
                <td>{column.name}</td><td><span className="type-chip">{column.inferred_type}</span></td>
                <td>{formatNumber(column.non_null_count, language)}</td><td>{formatNumber(column.missing_count, language)}</td><td>{formatNumber(column.unique_count, language)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>

      <section className="cleaning-section">
        <div className="pipeline-section-heading"><div><span>02</span><h4>{text.cleaning}</h4></div></div>
        <h5>{text.cleaningSummary}</h5>
        <div className="cleaning-comparison-table-wrap">
          <table className="cleaning-comparison-table">
            <thead><tr><th>{text.status}</th><th>{text.before}</th><th>{text.after}</th><th>{text.change}</th></tr></thead>
            <tbody>{comparisons.map((item) => (
              <tr key={item.label}><th>{item.label}</th><td>{formatNumber(item.before, language)}</td><td>{formatNumber(item.after, language)}</td><td>{formatChange(item.after - item.before, language)}</td></tr>
            ))}<tr><th>{text.unresolvedIssues}</th><td>-</td><td>-</td><td>{formatNumber(file.cleaning.rejected_rows, language)}</td></tr></tbody>
          </table>
        </div>
        <h5>{text.appliedChanges}</h5>
        {file.cleaning.transformations.length ? (
          <ul className="transformation-list">{file.cleaning.transformations.map((item) => (
            <li key={item.code}><span className="transformation-check"><Check size={14} /></span><div><strong>{item.label}</strong><p>{item.description}</p></div><small>{formatNumber(item.affected_rows, language)} {text.affectedRows} - {formatNumber(item.affected_cells, language)} {text.affectedCells}</small></li>
          ))}</ul>
        ) : <p className="pipeline-calm-state">{text.noChanges}</p>}
      </section>

      <section className="quality-section">
        <div className="pipeline-section-heading"><div><span>03</span><h4>{text.qualityIssues}</h4></div><StatusChip status={file.readiness}>{readinessLabel(file.readiness, text)}</StatusChip></div>
        {file.quality.issues.length || file.cleaning.warnings.length ? (
          <ul className="quality-issue-list">
            {file.quality.issues.map((issue) => <li key={issue.code}><AlertTriangle size={16} aria-hidden="true" /><div><strong>{issue.message}</strong><small>{issue.count ? `${formatNumber(issue.count, language)} ` : ""}{issue.columns?.join(", ") || "-"}</small></div></li>)}
            {file.cleaning.warnings.map((warning) => <li key={warning}><AlertTriangle size={16} aria-hidden="true" /><div><strong>{warning}</strong></div></li>)}
          </ul>
        ) : <p className="pipeline-calm-state is-success"><Check size={15} />{text.noIssues}</p>}
      </section>

      <section className="result-preview-section">
        <div className="upload-preview-tabs" role="tablist" aria-label={text.rawPreview}>
          <button type="button" role="tab" aria-selected={previewMode === "raw"} onClick={() => setPreviewMode("raw")}>{text.rawPreview}</button>
          <button type="button" role="tab" aria-selected={previewMode === "clean"} onClick={() => setPreviewMode("clean")}>{text.cleanedPreview}</button>
        </div>
        <PreviewTable preview={preview} text={text} notice={previewMode === "raw" ? text.rawPreviewNotice : text.previewNotice} />
      </section>

      <details className="deferred-rules"><summary>{text.deferred}</summary><p>{text.deferredNote}</p><ul>{file.cleaning.deferred_rules.map((rule) => <li key={rule}>{rule.replaceAll("_", " ")}</li>)}</ul></details>
    </article>
  );
}

function ProcessedQualitySnapshot({ result, language, text }) {
  const metrics = preparationMetrics(result);
  const rows = [
    { label: text.rows, before: metrics.received, after: metrics.retained },
    { label: text.missingCells, before: metrics.rawMissing, after: metrics.cleanedMissing },
    { label: text.duplicateRows, before: metrics.rawDuplicates, after: metrics.cleanedDuplicates },
    { label: text.rejectedRows, before: null, after: metrics.rejected },
  ];

  return (
    <section className="processed-quality-panel">
      <div className="processed-panel-heading">
        <div><span className="processed-panel-index">02</span><div><h3>{text.beforeAfterSnapshot}</h3><p>{text.qualitySnapshotNote}</p></div></div>
      </div>
      <div className="processed-quality-table-wrap">
        <table className="processed-quality-table">
          <thead><tr><th>{text.qualityMetric}</th><th>{text.before}</th><th>{text.after}</th><th>{text.change}</th></tr></thead>
          <tbody>{rows.map((item) => {
            const change = item.before === null ? null : item.after - item.before;
            return <tr key={item.label}><th>{item.label}</th><td>{snapshotValue(item.before, language, text)}</td><td>{snapshotValue(item.after, language, text)}</td><td>{snapshotValue(change, language, text)}</td></tr>;
          })}</tbody>
        </table>
      </div>
    </section>
  );
}

function ProcessedDatasetSummary({ files, language, text }) {
  return (
    <section className="processed-datasets-panel">
      <div className="processed-panel-heading">
        <div><span className="processed-panel-index">03</span><div><h3>{text.datasetSummary}</h3><p>{text.datasetSummaryNote}</p></div></div>
      </div>
      <div className="processed-dataset-table-wrap">
        <table className="processed-dataset-table">
          <thead><tr><th>{text.dataset}</th><th>{text.received}</th><th>{text.retained}</th><th>{text.removed}</th><th>{text.retentionPercent}</th><th>{text.status}</th></tr></thead>
          <tbody>{files.map((file) => {
            const received = asNumber(file.profile?.row_count);
            const retained = asNumber(file.cleaning?.after_rows);
            const removed = Math.max(0, received - retained);
            const status = file.readiness || "ready";
            return <tr key={file.filename}>
              <th><strong>{datasetLabel(file.dataset, text)}</strong><small>{file.filename}</small></th>
              <td>{formatNumber(received, language)}</td>
              <td>{formatNumber(retained, language)}</td>
              <td>{formatNumber(removed, language)}</td>
              <td>{percentage(retained, received) || text.notTracked}</td>
              <td><StatusChip status={status}>{readinessLabel(status, text)}</StatusChip></td>
            </tr>;
          })}</tbody>
        </table>
      </div>
    </section>
  );
}

function ProcessedPreviewPanel({ file, text }) {
  const status = file.readiness || "ready";
  return (
    <section className="processed-preview-panel">
      <div className="processed-preview-heading">
        <div><span className="processed-panel-index">04</span><div><h3>{text.cleanedPreview}</h3><p>{text.cleanedPreviewDescription}</p></div></div>
        <StatusChip status={status}>{readinessLabel(status, text)}</StatusChip>
      </div>
      <div className="processed-preview-file"><strong>{datasetLabel(file.dataset, text)}</strong><span>{file.filename}</span></div>
      <PreviewTable preview={file.cleaning?.cleaned_preview} text={text} />
    </section>
  );
}

function DatabaseUpdateSummary({ summary, persistence, language, text }) {
  if (!summary) {
    return <section className="processed-database-result is-muted"><Database size={18} aria-hidden="true" /><div><h3>{text.databaseUnavailable}</h3></div></section>;
  }

  const values = [
    [text.newRecords, summary.inserted_records],
    [text.updatedRecords, summary.updated_records],
    [text.unchangedRecords, summary.unchanged_records],
    [text.rejectedRecords, summary.rejected_records],
  ];
  const transactionSummary = summary.datasets?.find((item) => item.dataset === "transactions");
  return (
    <section className="processed-database-result">
      <div className="processed-database-heading"><Database size={18} aria-hidden="true" /><div><h3>{persistence === "postgres" ? text.databaseUpdated : text.persistenceUpdated}</h3><p>{persistence === "postgres" ? text.databaseSummary : text.persistenceSummary}</p></div></div>
      <div className="processed-database-metrics">{values.map(([label, value]) => <div key={label}><span>{label}</span><strong>{formatNumber(asNumber(value), language)}</strong></div>)}</div>
      {transactionSummary && <div className="processed-transaction-accounting"><strong>{text.transactionAccounting}</strong><div>
        <span>{formatNumber(asNumber(transactionSummary.new_orders), language)} {text.newTransactionOrders}</span>
        <span>{formatNumber(asNumber(transactionSummary.new_transaction_rows), language)} {text.newTransactionRows}</span>
        <span>{formatNumber(asNumber(transactionSummary.existing_orders_skipped), language)} {text.existingTransactionOrdersSkipped}</span>
        <span>{formatNumber(asNumber(transactionSummary.review_orders), language)} {text.transactionReviewOrders}</span>
        <span>{formatNumber(asNumber(transactionSummary.review_transaction_rows), language)} {text.transactionReviewRows}</span>
      </div></div>}
      {asNumber(summary.warning_count) > 0 && <small className="processed-database-warning">{formatNumber(summary.warning_count, language)} {text.warningCount.toLowerCase()}</small>}
    </section>
  );
}

function ProcessedOverview({ result, language, text }) {
  const metrics = preparationMetrics(result);
  const coverage = dateCoverageFor(result?.files || []);
  return (
    <>
      <header className="pipeline-ready-header">
        <div><span className="ready-check"><Check size={20} /></span><div><p className="section-eyebrow">{text.preparationComplete}</p><h2>{text.preparationComplete}</h2><p>{text.preparationDescription}</p></div></div>
      </header>
      <section className="processed-key-summary">
        <div className="processed-key-stats">
          <div><span>{text.datasetsProcessed}</span><strong>{formatNumber(result.total_files, language)}</strong></div>
          <div><span>{text.rawRows}</span><strong>{formatNumber(metrics.received, language)}</strong></div>
          <div><span>{text.cleanedRows}</span><strong>{formatNumber(metrics.retained, language)}</strong></div>
          <div><span>{text.rowsRemoved}</span><strong>{formatNumber(metrics.removed, language)}</strong></div>
        </div>
        <div className="processed-percentages">
          <div><strong>{percentage(metrics.retained, metrics.received) || text.notTracked}</strong><span>{text.retention}</span><small>{text.retentionFormula}</small></div>
          <div><strong>{percentage(metrics.removed, metrics.received) || text.notTracked}</strong><span>{text.rowsRemoved}</span><small>{text.removedFormula}</small></div>
        </div>
      </section>
      {coverage && <section className="processed-date-card"><CalendarDays size={18} aria-hidden="true" /><div><span>{text.dateCoverage}</span><strong>{datasetLabel(coverage.dataset, text)}</strong><p>{formatDateOnly(coverage.min, language)} / {formatDateOnly(coverage.max, language)}</p></div></section>}
    </>
  );
}

function RecentRunsPanel({ runs, language, text }) {
  const persistenceLabel = (value) => value === "postgres" ? text.postgres : value === "memory" ? text.inMemory : value || text.notTracked;
  return (
    <section className="processed-recent-panel">
      <div className="processed-panel-heading"><div><span className="processed-panel-index">06</span><div><h3>{text.recentRuns}</h3><p>{text.recentRunsNote}</p></div></div></div>
      {runs.length ? <div className="processed-recent-list">{runs.map((item) => <div className="processed-recent-item" key={item.run_id}>
        <div><strong>{(item.datasets || []).map((dataset) => datasetLabel(dataset, text)).join(" · ") || text.dataset}</strong><span>{text.completedOn}: {formatDateTime(item.completed_at || item.created_at, language)}</span></div>
        <div className="processed-recent-stats"><span>{persistenceLabel(item.persistence)}</span><span>{formatNumber(item.total_rows_cleaned, language)} {text.retained.toLowerCase()}</span><span>{item.retention_percentage === null || item.retention_percentage === undefined ? text.notTracked : `${item.retention_percentage}% ${text.retention.toLowerCase()}`}</span>{item.date_min && item.date_max && <span>{formatDateOnly(item.date_min, language)} → {formatDateOnly(item.date_max, language)}</span>}{asNumber(item.warning_count) > 0 && <span>{formatNumber(item.warning_count, language)} {text.warningCount.toLowerCase()}</span>}</div>
      </div>)}</div> : <p className="pipeline-calm-state">{text.noRecentRuns}</p>}
    </section>
  );
}

function DataUpload({ language = "en", onPipelineComplete }) {
  const text = translations[language] || translations.en;
  const [files, setFiles] = useState([]);
  const [datasetSelections, setDatasetSelections] = useState({});
  const [clientRejections, setClientRejections] = useState([]);
  const [localPreviews, setLocalPreviews] = useState({});
  const [run, setRun] = useState(null);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiStatus, setApiStatus] = useState("checking");
  const [activeResultFilename, setActiveResultFilename] = useState("");
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [reportError, setReportError] = useState(null);
  const [recentRuns, setRecentRuns] = useState([]);
  const [recentRunsLoaded, setRecentRunsLoaded] = useState(false);
  const [selectedDownloadDataset, setSelectedDownloadDataset] = useState("");
  const [selectedDownloadBusy, setSelectedDownloadBusy] = useState(false);
  const [allDownloadBusy, setAllDownloadBusy] = useState(false);
  const [downloadErrors, setDownloadErrors] = useState({ selected: null, all: null });
  const replaceInputRef = useRef(null);
  const [replaceTarget, setReplaceTarget] = useState(null);

  const processedFiles = useMemo(() => run?.result?.files || [], [run?.result?.files]);
  const downloadDatasetOptions = useMemo(
    () => [...new Set(processedFiles.map((file) => file.dataset).filter(Boolean))],
    [processedFiles],
  );

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

  const completedRunId = run?.result ? run.run_id : null;

  useEffect(() => {
    if (!completedRunId) return undefined;
    const controller = new AbortController();
    getRecentPreparationRuns({ limit: 8, signal: controller.signal })
      .then((items) => {
        setRecentRuns(Array.isArray(items) ? items : []);
        setRecentRunsLoaded(true);
      })
      .catch((recentError) => {
        if (recentError.name !== "AbortError") setRecentRunsLoaded(false);
      });
    return () => controller.abort();
  }, [completedRunId]);

  useEffect(() => {
    setSelectedDownloadDataset((current) => (
      downloadDatasetOptions.includes(current) ? current : downloadDatasetOptions[0] || ""
    ));
  }, [downloadDatasetOptions]);

  const invalidateCurrentRun = () => {
    setRun(null);
    setError(null);
    setReportGenerated(false);
    setReportError(null);
    setSelectedDownloadDataset("");
    setDownloadErrors({ selected: null, all: null });
  };

  const readPreviews = async (selectedFiles) => {
    const entries = await Promise.all(selectedFiles.map(async (file) => {
      try {
        const preview = parseCsvPreview(await file.text());
        return [fileKey(file), { ...preview, size: file.size, detection: detectDatasetFromHeaders(preview.headers) }];
      } catch {
        return [fileKey(file), { size: file.size, parseError: true, detection: { status: "needs_identification", dataset: "" } }];
      }
    }));
    setLocalPreviews((current) => ({ ...current, ...Object.fromEntries(entries) }));
  };

  const addSelectedFiles = async (fileList) => {
    const selected = Array.from(fileList || []);
    const accepted = selected.filter((file) => file.name.toLowerCase().endsWith(".csv") && file.size <= MAX_FILE_SIZE_BYTES);
    const rejected = selected.filter((file) => !accepted.includes(file));
    const replaced = files.filter((current) => accepted.some((file) => file.name === current.name));

    if (replaced.length) {
      setLocalPreviews((current) => {
        const next = { ...current };
        replaced.forEach((file) => delete next[fileKey(file)]);
        return next;
      });
      setDatasetSelections((current) => {
        const next = { ...current };
        replaced.forEach((file) => delete next[fileKey(file)]);
        return next;
      });
    }

    setFiles((current) => {
      const next = [...current];
      accepted.forEach((file) => {
        const existingIndex = next.findIndex((item) => item.name === file.name);
        if (existingIndex >= 0) next[existingIndex] = file;
        else if (!next.some((item) => fileKey(item) === fileKey(file))) next.push(file);
      });
      return next;
    });
    if (rejected.length) {
      setClientRejections((current) => {
        const retained = current.filter((item) => !rejected.some((file) => file.name === item.file.name));
        return [...retained, ...rejected.map((file) => ({ file, reason: "unsupported" }))];
      });
    }
    if (accepted.length) {
      setClientRejections((current) => current.filter((item) => !accepted.some((file) => file.name === item.file.name)));
      invalidateCurrentRun();
      await readPreviews(accepted);
    }
  };

  const handleFileSelection = async (event) => {
    await addSelectedFiles(event.target.files);
    event.target.value = "";
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    await addSelectedFiles(event.dataTransfer.files);
  };

  const removeFile = (file) => {
    const key = fileKey(file);
    setFiles((current) => current.filter((item) => fileKey(item) !== key));
    setLocalPreviews((current) => { const next = { ...current }; delete next[key]; return next; });
    setDatasetSelections((current) => { const next = { ...current }; delete next[key]; return next; });
    invalidateCurrentRun();
  };

  const removeRejected = (rejected) => {
    setClientRejections((current) => current.filter((item) => fileKey(item.file) !== fileKey(rejected.file)));
  };

  const beginReplacement = (file, rejected = false) => {
    setReplaceTarget({ key: fileKey(file), rejected });
    replaceInputRef.current?.click();
  };

  const handleReplacement = async (event) => {
    const replacement = event.target.files?.[0];
    const target = replaceTarget;
    event.target.value = "";
    setReplaceTarget(null);
    if (!replacement || !target) return;
    if (!replacement.name.toLowerCase().endsWith(".csv") || replacement.size > MAX_FILE_SIZE_BYTES) {
      setClientRejections((current) => [...current, { file: replacement, reason: "unsupported" }]);
      return;
    }
    if (files.some((file) => file.name === replacement.name && fileKey(file) !== target.key)) {
      setError(new ApiClientError("A file with that name is already in the batch.", { code: "duplicate_filename" }));
      return;
    }
    if (target.rejected) {
      setClientRejections((current) => current.filter((item) => fileKey(item.file) !== target.key));
      setFiles((current) => current.some((file) => file.name === replacement.name) ? current : [...current, replacement]);
      invalidateCurrentRun();
      await readPreviews([replacement]);
      return;
    }
    const targetKey = target.key;
    const previous = files.find((file) => fileKey(file) === targetKey);
    setFiles((current) => current.map((file) => fileKey(file) === targetKey ? replacement : file));
    setLocalPreviews((current) => { const next = { ...current }; delete next[targetKey]; return next; });
    setDatasetSelections((current) => { const next = { ...current }; delete next[targetKey]; return next; });
    invalidateCurrentRun();
    if (previous) await readPreviews([replacement]);
  };

  const selectedRows = useMemo(() => files.map((file) => {
    const key = fileKey(file);
    const preview = localPreviews[key] || {};
    const detection = preview.detection || detectDatasetFromHeaders(preview.headers || []);
    const dataset = datasetSelections[key] || detection.dataset || "";
    const needsReview = Boolean(preview.parseError || preview.malformedRows);
    return {
      file,
      key,
      preview,
      detection,
      dataset,
      status: needsReview ? "warning" : dataset ? "ready" : "warning",
    };
  }), [datasetSelections, files, localPreviews]);

  const setDatasetForFile = (key, dataset) => {
    setDatasetSelections((current) => ({ ...current, [key]: dataset }));
    invalidateCurrentRun();
  };

  const validateBatch = () => {
    if (!selectedRows.length) return new ApiClientError("Select at least one CSV file before processing.", { code: "no_files" });
    const needsIdentification = selectedRows.filter((row) => !row.dataset);
    if (needsIdentification.length) {
      return new ApiClientError("Identify each dataset before processing the batch.", {
        code: "dataset_identification_required",
        details: needsIdentification.map((row) => ({ code: "dataset_identification_required", message: row.file.name, columns: [] })),
      });
    }
    const duplicateDatasets = [...new Set(selectedRows.map((row) => row.dataset).filter((dataset, index, all) => all.indexOf(dataset) !== index))];
    if (duplicateDatasets.length) {
      return new ApiClientError(`Only one file per dataset type can be processed in a batch: ${duplicateDatasets.map((dataset) => datasetLabel(dataset, text)).join(", ")}.`, { code: "duplicate_dataset_type" });
    }
    const invalidPreviews = selectedRows.filter((row) => row.preview.parseError || row.preview.malformedRows);
    if (invalidPreviews.length) {
      return new ApiClientError("One or more files need CSV validation before processing.", {
        code: "invalid_csv",
        details: invalidPreviews.map((row) => ({ code: "invalid_csv", message: row.file.name, columns: [] })),
      });
    }
    return null;
  };

  // Derive whether the batch can actually be submitted right now
  const hasUnidentified = selectedRows.some((row) => !row.dataset);
  const hasInvalidCsv = selectedRows.some((row) => row.preview.parseError || row.preview.malformedRows);
  const canSubmit = files.length > 0 && !hasUnidentified && !hasInvalidCsv && !isSubmitting;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    const batchError = validateBatch();
    if (batchError) {
      setError(batchError);
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setReportError(null);
    try {
      const acceptedRun = await uploadPipelineRun(files, {
        datasetTypes: Object.fromEntries(selectedRows.map((row) => [row.file.name, row.dataset])),
      });
      setRun(acceptedRun);
      setApiStatus("connected");
      setReportGenerated(false);
      onPipelineComplete?.(acceptedRun);
    } catch (uploadError) {
      setError(uploadError);
      if (uploadError.code === "network_error") setApiStatus("unavailable");
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateReport = async () => {
    if (!run?.run_id || isGeneratingReport) return;
    setIsGeneratingReport(true);
    setReportError(null);
    try {
      await downloadPreparationReport(run.run_id);
      setReportGenerated(true);
    } catch (generationError) {
      setReportError(generationError);
      if (generationError.code === "network_error") setApiStatus("unavailable");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const downloadSelected = async () => {
    if (!run?.run_id || !selectedDownloadResult || selectedDownloadBusy || allDownloadBusy) return;
    setSelectedDownloadBusy(true);
    setDownloadErrors((current) => ({ ...current, selected: null }));
    try {
      await downloadCleanedDataset(run.run_id, selectedDownloadResult.dataset);
    } catch (downloadFailure) {
      setDownloadErrors((current) => ({ ...current, selected: downloadFailure }));
      if (downloadFailure.code === "network_error") setApiStatus("unavailable");
    } finally {
      setSelectedDownloadBusy(false);
    }
  };

  const downloadAll = async () => {
    if (!run?.run_id || allDownloadBusy || selectedDownloadBusy) return;
    setAllDownloadBusy(true);
    setDownloadErrors((current) => ({ ...current, all: null }));
    try {
      await downloadAllCleanedDatasets(run.run_id);
    } catch (downloadFailure) {
      setDownloadErrors((current) => ({ ...current, all: downloadFailure }));
      if (downloadFailure.code === "network_error") setApiStatus("unavailable");
    } finally {
      setAllDownloadBusy(false);
    }
  };

  const clearBatch = () => {
    setFiles([]);
    setDatasetSelections({});
    setClientRejections([]);
    setLocalPreviews({});
    setRun(null);
    setError(null);
    setReportGenerated(false);
    setReportError(null);
    setSelectedDownloadDataset("");
    setDownloadErrors({ selected: null, all: null });
  };

  const currentStage = run?.stage || "upload";
  const currentError = error || (run?.error ? new ApiClientError(run.error.message, run.error) : null);
  const activeResult = processedFiles.find((file) => file.filename === activeResultFilename) || processedFiles[0];
  const resolvedDownloadDataset = downloadDatasetOptions.includes(selectedDownloadDataset)
    ? selectedDownloadDataset
    : downloadDatasetOptions[0] || "";
  const selectedDownloadResult = processedFiles.find((file) => file.dataset === resolvedDownloadDataset);
  const selectedDownloadLabel = text.downloadSelectedCsv.replace(
    "{dataset}",
    selectedDownloadResult ? datasetLabel(selectedDownloadResult.dataset, text) : text.dataset,
  );
  return (
    <section className="page-shell upload-page">
      <ScrollReveal>
        <header className="upload-page-header">
          <div><h2>{text.title}</h2><p>{text.description}</p></div>
          <span className={`api-connection api-connection--${apiStatus}`}><i aria-hidden="true" />{text[apiStatus]}</span>
        </header>
      </ScrollReveal>

      <ScrollReveal delay={60}>
        <ol className="pipeline-stepper" aria-label={text.currentStage}>
          {PIPELINE_STEPS.map((step, index) => {
            const state = userStepState(run, step, reportGenerated);
            return <li key={step.key} data-state={state} aria-current={userStageFor(currentStage) === step.key ? "step" : undefined}>
              <span>{state === "completed" ? <Check size={15} /> : index + 1}</span>
              <div><strong>{text.userStages[step.key]}</strong><small>{text.userStageDescriptions[step.key]}</small></div>
            </li>;
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
              <span className="button button--primary"><Plus size={16} />{text.browse}</span>
              <input type="file" accept=".csv,text/csv" multiple onChange={handleFileSelection} />
            </label>

            <div className="upload-control-panel">
              <div className="batch-heading"><div><span>{text.selectedFiles}</span><strong>{files.length}</strong></div>{files.length > 0 && <button type="button" className="button button--text" onClick={clearBatch}>{text.clearBatch}</button>}</div>
              <div className="batch-table-wrap">
                {!selectedRows.length && !clientRejections.length ? <p className="batch-empty">{text.noFiles}</p> : (
                  <table className="batch-table">
                    <thead><tr><th>{text.file}</th><th>{text.dataset}</th><th>{text.rows}</th><th>{text.status}</th><th>{text.actions}</th></tr></thead>
                    <tbody>
                      {selectedRows.map((row) => (
                        <tr key={row.key}>
                          <td><div className="batch-file-name"><FileText size={16} /><span><strong>{row.file.name}</strong><small>{formatFileSize(row.file.size, language)}</small></span></div></td>
                          <td>{row.dataset ? <span className="dataset-chip">{datasetLabel(row.dataset, text)}</span> : <select value="" onChange={(event) => setDatasetForFile(row.key, event.target.value)}><option value="">{text.chooseDataset}</option>{SUPPORTED_DATASETS.map((dataset) => <option key={dataset} value={dataset}>{datasetLabel(dataset, text)}</option>)}</select>}</td>
                          <td>{row.preview.rowCount ? formatNumber(row.preview.rowCount, language) : "-"}</td>
                          <td><span className={`data-status-chip ${row.status === "ready" ? "is-ready" : "is-warning"}`}>{row.preview.parseError ? text.validationReview : row.dataset ? text.readyToProcess : text.needsIdentification}</span></td>
                          <td><div className="batch-actions"><button type="button" className="button button--text" onClick={() => beginReplacement(row.file)}>{text.replace}</button><button type="button" className="icon-button" onClick={() => removeFile(row.file)} aria-label={`${text.remove} ${row.file.name}`}><X size={15} /></button></div></td>
                        </tr>
                      ))}
                      {clientRejections.map((item) => <tr key={`rejected-${fileKey(item.file)}`} className="batch-row-rejected"><td><div className="batch-file-name"><AlertTriangle size={16} /><span><strong>{item.file.name}</strong><small>{text.rejected}</small></span></div></td><td>-</td><td>-</td><td><span className="data-status-chip is-error">{text.rejected}</span></td><td><div className="batch-actions"><button type="button" className="button button--text" onClick={() => beginReplacement(item.file, true)}>{text.replace}</button><button type="button" className="button button--text" onClick={() => removeRejected(item)}>{text.remove}</button></div></td></tr>)}
                    </tbody>
                  </table>
                )}
              </div>
              <input ref={replaceInputRef} className="replace-input" type="file" accept=".csv,text/csv" onChange={handleReplacement} />
              <button
                className="button button--primary upload-submit"
                type="submit"
                disabled={!canSubmit}
                title={
                  !files.length
                    ? "Add CSV files to the batch first"
                    : hasUnidentified
                    ? "All files must have a dataset type — use the dropdown in the Dataset column to identify any file showing \"Needs identification\""
                    : hasInvalidCsv
                    ? "One or more files have CSV formatting issues — review and replace them"
                    : undefined
                }
              >
                {isSubmitting ? <RefreshCw className="spin" size={17} /> : <ArrowRight size={17} />}
                {isSubmitting ? text.processing : `${text.processFiles} ${files.length}`}
              </button>
              {files.length > 0 && hasUnidentified && (
                <p className="upload-inline-error" style={{ marginTop: "0.5rem" }}>
                  <AlertTriangle size={15} />
                  <span>Each file must be assigned a dataset type before processing. Use the dropdown in the <strong>Dataset</strong> column for any file showing <em>Needs identification</em>.</span>
                </p>
              )}
            </div>

            {clientRejections.length > 0 && <div className="upload-inline-error"><AlertTriangle size={17} /><span>{text.clientFileError}</span></div>}
            {currentError && <div className="upload-error-panel" role="alert"><AlertTriangle size={20} /><div><strong>{text.errorTitle}</strong><p>{currentError.message}</p>{currentError.details?.length > 0 && <details><summary>{text.details}</summary><ul>{currentError.details.map((detail, index) => <li key={`${detail.code || "detail"}-${index}`}>{detail.message} {detail.columns?.join(", ")}</li>)}</ul></details>}</div><button type="submit" className="button button--secondary">{text.retry}</button></div>}
          </form>
        </ScrollReveal>
      )}

      {run && !run.result && !currentError && <ScrollReveal delay={120}><section className="pipeline-live-state" aria-live="polite"><span className="pipeline-live-icon"><RefreshCw className="spin" size={20} /></span><div><span>{text.currentStage}</span><strong>{text.userStages[userStageFor(currentStage)]}</strong><p>{run.message}</p></div></section></ScrollReveal>}

      {run?.result && (
        <ScrollReveal delay={120}>
          <section className="pipeline-result-shell" aria-live="polite">
            <ProcessedOverview result={run.result} language={language} text={text} />
            <ProcessedQualitySnapshot result={run.result} language={language} text={text} />
            <ProcessedDatasetSummary files={run.result.files} language={language} text={text} />

            {run.result.files.length > 1 && <div className="dataset-selector processed-dataset-selector" role="tablist" aria-label={text.dataset}><span>{text.dataset}</span>{run.result.files.map((file) => <button type="button" role="tab" aria-selected={activeResult?.filename === file.filename} className={activeResult?.filename === file.filename ? "is-active" : ""} onClick={() => setActiveResultFilename(file.filename)} key={file.filename}>{datasetLabel(file.dataset, text)}</button>)}</div>}
            {activeResult && <>
              <ProcessedPreviewPanel file={activeResult} text={text} />
              <section className="processed-actions-panel">
                <div className="processed-actions-heading"><div><span className="processed-panel-index">05</span><div><h3>{text.downloadCleanedData}</h3><p>{text.downloadDescription}</p></div></div></div>
                <div className="processed-download-controls">
                  <label htmlFor="cleaned-dataset-select">{text.downloadDataset}</label>
                  <select
                    id="cleaned-dataset-select"
                    value={resolvedDownloadDataset}
                    onChange={(event) => {
                      setSelectedDownloadDataset(event.target.value);
                      setDownloadErrors((current) => ({ ...current, selected: null }));
                    }}
                    disabled={!downloadDatasetOptions.length || selectedDownloadBusy || allDownloadBusy}
                  >
                    {downloadDatasetOptions.map((dataset) => <option key={dataset} value={dataset}>{datasetLabel(dataset, text)}</option>)}
                  </select>
                </div>
                <div className="processed-actions-buttons">
                  <button type="button" className="button button--primary" onClick={downloadSelected} disabled={!selectedDownloadResult || selectedDownloadBusy || allDownloadBusy}>
                    {selectedDownloadBusy ? <RefreshCw className="spin" size={16} /> : <Download size={16} />}{selectedDownloadLabel}
                  </button>
                  <button type="button" className="button button--secondary" onClick={downloadAll} disabled={!downloadDatasetOptions.length || selectedDownloadBusy || allDownloadBusy}>
                    {allDownloadBusy ? <RefreshCw className="spin" size={16} /> : <Download size={16} />}{text.downloadAllCleaned}
                  </button>
                </div>
                {downloadErrors.selected && <div className="report-error" role="alert"><AlertTriangle size={17} /><span><strong>{text.selectedDownloadError}</strong><small>{downloadErrors.selected.message}</small></span></div>}
                {downloadErrors.all && <div className="report-error" role="alert"><AlertTriangle size={17} /><span><strong>{text.allDownloadError}</strong><small>{downloadErrors.all.message}</small></span></div>}
              </section>
              <details className="processed-details">
                <summary><span>{text.viewDetails}</span><ChevronDown size={16} aria-hidden="true" /></summary>
                <div className="processed-details-body"><FileResultPanel file={activeResult} language={language} text={text} /></div>
              </details>
            </>}

            <DatabaseUpdateSummary summary={run.result.import_summary} persistence={run.result.persistence} language={language} text={text} />

            <section className="report-generation-panel"><div><span>07</span><div><h3>{text.downloadPdfReport}</h3><p>{text.reportDescription}</p></div></div><div className="report-actions"><button type="button" className="button button--primary" onClick={generateReport} disabled={isGeneratingReport}>{isGeneratingReport ? <RefreshCw className="spin" size={17} /> : <Download size={17} />}{isGeneratingReport ? text.generatingReport : text.downloadPdfReport}</button>{reportGenerated && <span className="report-ready-label"><Check size={14} />{text.reportReady}</span>}</div>{reportError && <div className="report-error" role="alert"><AlertTriangle size={17} /><span><strong>{text.reportError}</strong><small>{reportError.message}</small></span></div>}</section>

            {recentRunsLoaded && <RecentRunsPanel runs={recentRuns} language={language} text={text} />}
            <button type="button" className="button button--secondary pipeline-reset" onClick={clearBatch}><RefreshCw size={16} />{text.processAnotherBatch}</button>
          </section>
        </ScrollReveal>
      )}
    </section>
  );
}

export default DataUpload;
