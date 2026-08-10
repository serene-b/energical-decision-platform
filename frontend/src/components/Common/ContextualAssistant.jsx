import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Bot,
  Check,
  LoaderCircle,
  LockKeyhole,
  Send,
  Sparkles,
  X,
} from "lucide-react";

import { queryAssistant } from "../../api/pipeline.js";

const translations = {
  en: {
    close: "Close panel",
    insightEyebrow: "Contextual exploration",
    investigate: "Continue investigating",
    askAi: "Ask AI about this",
    assistantEyebrow: "Contextual assistant",
    assistantTitle: "Energical AI",
    assistantDescription: "Ask about the current page or approved selection context.",
    approvedContext: "Context shared with the assistant",
    selection: "Selection",
    boundary: "Privacy boundary",
    boundaryValue: "Curated metrics only · no raw rows, customer records, SQL, or database access",
    suggestions: "Suggested prompts",
    prompts: {
      upload: ["Summarize the quality checks", "List the applied transformations", "Which rules remain deferred?"],
      default: ["What context is available here?", "Explain the selected metric", "What should I inspect next?"],
    },
    placeholder: "Ask about this context…",
    send: "Send question",
    providerBoundary: "AI provider not connected",
    providerBoundaryDescription:
      "Your question reached the protected integration boundary, but was not sent to a model. No answer was generated.",
    thinking: "Contacting the approved assistant boundary…",
    emptyContext: "Current page",
  },
  fr: {
    close: "Fermer le panneau",
    insightEyebrow: "Exploration contextuelle",
    investigate: "Poursuivre l’exploration",
    askAi: "Demander à l’IA",
    assistantEyebrow: "Assistant contextuel",
    assistantTitle: "Energical AI",
    assistantDescription: "Posez une question sur la page ou la sélection approuvée.",
    approvedContext: "Contexte partagé avec l’assistant",
    selection: "Sélection",
    boundary: "Frontière de confidentialité",
    boundaryValue: "Indicateurs sélectionnés uniquement · aucune ligne brute, donnée client, requête SQL ou base de données",
    suggestions: "Questions suggérées",
    prompts: {
      upload: ["Résumer les contrôles qualité", "Lister les transformations appliquées", "Quelles règles restent différées ?"],
      default: ["Quel contexte est disponible ici ?", "Expliquer l’indicateur sélectionné", "Que faut-il examiner ensuite ?"],
    },
    placeholder: "Poser une question sur ce contexte…",
    send: "Envoyer la question",
    providerBoundary: "Fournisseur IA non connecté",
    providerBoundaryDescription:
      "Votre question a atteint la frontière d’intégration protégée, mais n’a pas été envoyée à un modèle. Aucune réponse n’a été générée.",
    thinking: "Connexion à la frontière d’assistance approuvée…",
    emptyContext: "Page actuelle",
  },
};

function DrawerFrame({ children, className = "", onClose, closeLabel }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className={`context-drawer-backdrop ${className}`} onMouseDown={onClose}>
      <aside className="context-drawer" role="dialog" aria-modal="true" aria-label="Energical AI" onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className="context-drawer-close icon-button" onClick={onClose} aria-label={closeLabel}><X size={18} strokeWidth={1.8} /></button>
        {children}
      </aside>
    </div>
  );
}

function ContextualInsightDrawer({ insight, language = "en", onClose, onAskAI, onNavigate }) {
  const text = translations[language] || translations.en;
  if (!insight) return null;

  const metric = insight.approved_metrics?.revenue_m_da
    ? `${insight.approved_metrics.revenue_m_da}M DA`
    : insight.approved_metrics?.revenue
      || (insight.approved_metrics?.share_pct ? `${insight.approved_metrics.share_pct}%` : "—");

  return (
    <DrawerFrame onClose={onClose} closeLabel={text.close}>
      <div className="context-drawer-topline"><span className="context-drawer-icon context-drawer-icon--orange"><Sparkles size={17} /></span><p className="panel-eyebrow">{text.insightEyebrow}</p></div>
      <h2>{insight.title}</h2>
      <p className="context-drawer-description">{insight.description}</p>
      <div className="context-metric-card"><span>{insight.metric_label}</span><strong>{metric}</strong><small>{insight.selection_label || insight.selection}</small></div>
      <div className="context-drawer-section"><p className="context-drawer-section-label">{text.investigate}</p><div className="context-suggestion-list">
        {(insight.suggestions || []).map((suggestion) => <button type="button" className="context-suggestion" key={suggestion.id} onClick={() => onNavigate(suggestion.tabId, suggestion.context)}><span>{suggestion.label[language]}</span><ArrowRight size={15} /></button>)}
      </div></div>
      <button type="button" className="context-ai-button" onClick={() => onAskAI(insight.aiContext || insight)}><Bot size={17} />{text.askAi}</button>
    </DrawerFrame>
  );
}

function ContextualAssistantDrawer({ context, language = "en", onClose }) {
  const text = translations[language] || translations.en;
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [boundaryError, setBoundaryError] = useState(null);
  const approvedMetrics = useMemo(() => Object.entries(context?.approved_metrics || {}), [context]);
  const prompts = context?.page === "upload" ? text.prompts.upload : text.prompts.default;

  if (!context) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    const cleanQuestion = question.trim();
    if (!cleanQuestion || isSending) return;
    setMessages((current) => [...current, { role: "user", content: cleanQuestion }]);
    setQuestion("");
    setBoundaryError(null);
    setIsSending(true);
    try {
      const response = await queryAssistant({
        page: context.page,
        selection_type: context.selection_type,
        selection: context.selection,
        approved_metrics: context.approved_metrics || {},
        question: cleanQuestion,
      });
      if (response?.answer) {
        setMessages((current) => [...current, { role: "assistant", content: response.answer }]);
      }
    } catch (error) {
      setBoundaryError(error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <DrawerFrame onClose={onClose} closeLabel={text.close} className="context-drawer-backdrop--assistant">
      <div className="assistant-drawer-header">
        <div className="context-drawer-topline"><span className="context-drawer-icon"><Bot size={17} /></span><p className="panel-eyebrow">{text.assistantEyebrow}</p></div>
        <h2>{text.assistantTitle}</h2><p className="context-drawer-description">{text.assistantDescription}</p>
      </div>

      <div className="assistant-boundary-note"><LockKeyhole size={15} /><span><strong>{text.boundary}</strong>{text.boundaryValue}</span></div>

      <details className="assistant-context-details">
        <summary>{text.approvedContext}</summary>
        <dl className="assistant-context-list">
          <div><dt>{text.selection}</dt><dd>{context.selection || text.emptyContext}</dd></div>
          {approvedMetrics.map(([key, value]) => <div key={key}><dt>{key.replaceAll("_", " ")}</dt><dd>{String(value)}</dd></div>)}
        </dl>
      </details>

      <div className="assistant-conversation" aria-live="polite">
        {messages.map((message, index) => <div className={`assistant-message assistant-message--${message.role}`} key={`${message.role}-${index}`}>{message.content}</div>)}
        {isSending && <div className="assistant-loading"><LoaderCircle className="spin" size={16} />{text.thinking}</div>}
        {boundaryError && <div className="assistant-provider-state" role="status"><span><Check size={15} /></span><div><strong>{text.providerBoundary}</strong><p>{boundaryError.code === "assistant_not_configured" ? text.providerBoundaryDescription : boundaryError.message}</p></div></div>}
      </div>

      {!messages.length && <div className="assistant-suggestions"><span>{text.suggestions}</span>{prompts.map((prompt) => <button type="button" key={prompt} onClick={() => setQuestion(prompt)}>{prompt}<ArrowRight size={14} /></button>)}</div>}

      <form className="assistant-composer" onSubmit={handleSubmit}>
        <label><span className="sr-only">{text.placeholder}</span><textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={text.placeholder} rows="3" /></label>
        <button type="submit" disabled={!question.trim() || isSending} aria-label={text.send}><Send size={17} /></button>
      </form>
    </DrawerFrame>
  );
}

export { ContextualAssistantDrawer, ContextualInsightDrawer };
