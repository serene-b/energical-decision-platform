import { AlertTriangle, LoaderCircle, RefreshCw } from "lucide-react";

const labels = {
  en: {
    loading: "Loading approved analytics",
    noData: "Upload a dataset to activate this view.",
    network: "The API could not be reached. Start the backend and try again.",
    database: "The database is unavailable. Restore the database connection and retry.",
    request: "The API rejected this request.",
    server: "The backend returned an error. Retry after checking the server logs.",
    unavailable: "This analytical view is not available for the current dataset.",
    retry: "Retry",
  },
  fr: {
    loading: "Chargement des analyses approuvées",
    noData: "Importez un jeu de données pour activer cette vue.",
    network: "L’API est inaccessible. Démarrez le backend puis réessayez.",
    database: "La base de données est indisponible. Restaurez la connexion puis réessayez.",
    request: "L’API a rejeté cette requête.",
    server: "Le backend a renvoyé une erreur. Vérifiez les logs puis réessayez.",
    unavailable: "Cette analyse n’est pas disponible pour le jeu de données actuel.",
    retry: "Réessayer",
  },
};

function AnalyticsState({ language = "en", isLoading, error, onRetry, children }) {
  const text = labels[language] || labels.en;
  if (isLoading) {
    return <div className="analytics-state analytics-state--loading" role="status"><LoaderCircle className="spin" size={18} />{text.loading}</div>;
  }
  if (error || !children) {
    const message = error?.code === "network_error"
      ? text.network
      : error?.code === "database_unavailable"
        ? text.database
        : error?.status >= 500
          ? (error.message || text.server)
          : error?.status >= 400
            ? (error.message || text.request)
            : error?.code === "analytics_not_available"
              ? text.noData
              : error?.message || text.unavailable;
    return (
      <div className="analytics-state analytics-state--empty" role="status">
        <AlertTriangle size={17} aria-hidden="true" />
        <span>{message}</span>
        {onRetry && <button type="button" className="text-button" onClick={onRetry}><RefreshCw size={14} />{text.retry}</button>}
      </div>
    );
  }
  return children;
}

export default AnalyticsState;
