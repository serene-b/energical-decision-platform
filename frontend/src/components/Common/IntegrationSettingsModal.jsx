import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, AlertCircle, Key, Loader2, Sparkles, Trash2, X, Upload } from "lucide-react";
import {
  getGA4IntegrationStatus,
  saveGA4Credentials,
  testGA4Connection,
  deleteGA4Credentials,
} from "../../api/integrations.js";

const copy = {
  en: {
    title: "Analytics & Integrations",
    subtitle: "Configure live Google Analytics 4 credentials and connection settings.",
    ga4Title: "Google Analytics 4 (GA4)",
    ga4Desc: "Connect your GA4 property to unlock real-time web traffic, user journeys, acquisition channels, and device analytics.",
    statusConfigured: "Connected & Active",
    statusNotConfigured: "Not Connected",
    sourceDb: "Database Stored",
    sourceEnv: "Environment (.env)",
    propertyIdLabel: "GA4 Property ID",
    propertyIdPlaceholder: "e.g. 123456789 or properties/123456789",
    credsLabel: "Service Account Credentials (JSON)",
    credsPlaceholder: "Paste your Google Cloud Service Account JSON key content here...",
    uploadJson: "Upload JSON File",
    testBtn: "Test Connection",
    saveBtn: "Save & Connect",
    disconnectBtn: "Disconnect",
    testing: "Testing connection...",
    saving: "Saving credentials...",
    close: "Close",
  },
  fr: {
    title: "Analytique & Intégrations",
    subtitle: "Configurez vos identifiants Google Analytics 4 et paramètres de connexion en direct.",
    ga4Title: "Google Analytics 4 (GA4)",
    ga4Desc: "Connectez votre propriété GA4 pour débloquer le trafic web en temps réel, les parcours clients, les canaux d'acquisition et les appareils.",
    statusConfigured: "Connecté & Actif",
    statusNotConfigured: "Non Connecté",
    sourceDb: "Stocké en Base de Données",
    sourceEnv: "Fichier d'environnement (.env)",
    propertyIdLabel: "ID de propriété GA4",
    propertyIdPlaceholder: "ex. 123456789 ou properties/123456789",
    credsLabel: "Identifiants de compte de service (JSON)",
    credsPlaceholder: "Collez le contenu de votre clé JSON de compte de service Google Cloud ici...",
    uploadJson: "Importer un fichier JSON",
    testBtn: "Tester la connexion",
    saveBtn: "Enregistrer & Connecter",
    disconnectBtn: "Déconnecter",
    testing: "Test de connexion en cours...",
    saving: "Enregistrement en cours...",
    close: "Fermer",
  },
};

function IntegrationSettingsModal({ isOpen, onClose, language = "en", onSaved }) {
  const text = copy[language] || copy.en;
  const [status, setStatus] = useState(null);
  const [propertyId, setPropertyId] = useState("");
  const [credentialsJson, setCredentialsJson] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const loadStatus = () => {
    setIsLoading(true);
    getGA4IntegrationStatus()
      .then((data) => {
        setStatus(data);
        if (data?.property_id) {
          setPropertyId(data.property_id);
        }
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  };

  useEffect(() => {
    if (!isOpen) return;
    let isSubscribed = true;
    getGA4IntegrationStatus()
      .then((data) => {
        if (!isSubscribed) return;
        setStatus(data);
        if (data?.property_id) {
          setPropertyId(data.property_id);
        }
        setIsLoading(false);
      })
      .catch(() => {
        if (isSubscribed) setIsLoading(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const textContent = event.target?.result;
        JSON.parse(textContent); // validate JSON syntax
        setCredentialsJson(textContent);
        setErrorMsg("");
      } catch {
        setErrorMsg("The uploaded file is not a valid JSON document.");
      }
    };
    reader.readAsText(file);
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    setErrorMsg("");
    try {
      const res = await testGA4Connection(propertyId, credentialsJson);
      setTestResult(res);
    } catch (err) {
      setTestResult({ success: false, message: err.message || "Connection test failed." });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!propertyId.trim()) {
      setErrorMsg("Property ID is required.");
      return;
    }
    setIsSaving(true);
    setErrorMsg("");
    try {
      const res = await saveGA4Credentials(propertyId, credentialsJson);
      if (res.test_result) {
        setTestResult(res.test_result);
      }
      loadStatus();
      onSaved?.();
    } catch (err) {
      setErrorMsg(err.message || "Failed to save GA4 credentials.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Disconnect GA4 credentials from the database?")) return;
    try {
      await deleteGA4Credentials();
      setPropertyId("");
      setCredentialsJson("");
      setTestResult(null);
      loadStatus();
      onSaved?.();
    } catch (err) {
      setErrorMsg(err.message || "Failed to delete credentials.");
    }
  };

  return createPortal(
    <div className="regional-drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="regional-drawer"
        style={{ width: "min(640px, 95vw)", padding: "28px 32px" }}
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="icon-button regional-drawer-close"
          onClick={onClose}
          aria-label={text.close}
        >
          <X size={18} />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              background: "rgba(232, 98, 44, 0.12)",
              color: "var(--brand-orange)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Key size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.4rem" }}>{text.title}</h3>
            <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.85rem" }}>
              {text.subtitle}
            </p>
          </div>
        </div>

        <hr style={{ border: 0, borderTop: "1px solid var(--border-subtle)", margin: "18px 0" }} />

        {isLoading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)" }}>
            <Loader2 className="animate-spin" size={28} style={{ margin: "0 auto 10px" }} />
            <p>Loading integration status...</p>
          </div>
        ) : (
          <form onSubmit={handleSave}>
            {/* Status Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px",
                borderRadius: "12px",
                background: status?.is_configured ? "rgba(37, 116, 81, 0.08)" : "rgba(232, 98, 44, 0.08)",
                border: `1px solid ${status?.is_configured ? "rgba(37, 116, 81, 0.25)" : "rgba(232, 98, 44, 0.25)"}`,
                marginBottom: "20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {status?.is_configured ? (
                  <CheckCircle2 size={20} style={{ color: "#257451" }} />
                ) : (
                  <AlertCircle size={20} style={{ color: "var(--brand-orange)" }} />
                )}
                <div>
                  <strong style={{ display: "block", fontSize: "0.92rem" }}>
                    {status?.is_configured ? text.statusConfigured : text.statusNotConfigured}
                  </strong>
                  {status?.is_configured && (
                    <small style={{ color: "var(--text-secondary)" }}>
                      {status.source === "database" ? text.sourceDb : text.sourceEnv} · {status.masked_property_id}
                    </small>
                  )}
                </div>
              </div>

              {status?.source === "database" && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="icon-button"
                  style={{ color: "#d93025" }}
                  title={text.disconnectBtn}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            {/* Property ID */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px" }}>
                {text.propertyIdLabel} <span style={{ color: "var(--brand-orange)" }}>*</span>
              </label>
              <input
                type="text"
                className="di-input"
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                placeholder={text.propertyIdPlaceholder}
                required
                style={{ width: "100%" }}
              />
            </div>

            {/* Service Account JSON */}
            <div style={{ marginBottom: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                  {text.credsLabel}
                </label>
                <label
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--brand-orange)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <Upload size={13} /> {text.uploadJson}
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileUpload}
                    style={{ display: "none" }}
                  />
                </label>
              </div>
              <textarea
                className="di-input"
                rows={4}
                value={credentialsJson}
                onChange={(e) => setCredentialsJson(e.target.value)}
                placeholder={text.credsPlaceholder}
                style={{
                  width: "100%",
                  fontFamily: "monospace",
                  fontSize: "0.8rem",
                  padding: "10px",
                  resize: "vertical",
                }}
              />
            </div>

            {/* Error Banner */}
            {errorMsg && (
              <div className="platform-warning-banner platform-warning-banner--danger" style={{ marginBottom: "16px" }}>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Test Result Message */}
            {testResult && (
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: "10px",
                  fontSize: "0.85rem",
                  marginBottom: "16px",
                  background: testResult.success ? "rgba(37, 116, 81, 0.1)" : "rgba(229, 72, 77, 0.1)",
                  border: `1px solid ${testResult.success ? "rgba(37, 116, 81, 0.3)" : "rgba(229, 72, 77, 0.3)"}`,
                  color: testResult.success ? "#257451" : "#d93025",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px",
                }}
              >
                {testResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{testResult.message}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "20px" }}>
              <button
                type="button"
                className="button button--secondary"
                onClick={handleTest}
                disabled={isTesting || isSaving || !propertyId.trim()}
              >
                {isTesting ? (
                  <>
                    <Loader2 className="animate-spin" size={14} /> {text.testing}
                  </>
                ) : (
                  <>
                    <Sparkles size={14} /> {text.testBtn}
                  </>
                )}
              </button>

              <button
                type="submit"
                className="button button--primary"
                disabled={isSaving || isTesting || !propertyId.trim()}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="animate-spin" size={14} /> {text.saving}
                  </>
                ) : (
                  text.saveBtn
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}

export default IntegrationSettingsModal;
