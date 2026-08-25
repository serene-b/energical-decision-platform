import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  Bot,
  CircleAlert,
  RotateCcw,
  Send,
  Sparkles,
  X,
} from "lucide-react";

import { queryAssistant } from "../../api/pipeline.js";
import { AssistantMessage, AssistantTypingIndicator } from "./AssistantMessage.jsx";

const translations = {
  en: {
    close: "Close panel",
    insightEyebrow: "Contextual exploration",
    investigate: "Continue investigating",
    askAi: "Ask AI about this",
    assistantEyebrow: "Business analysis",
    assistantTitle: "Energical AI",
    businessAnalyst: "Your intelligent business analyst",
    assistantDescription: "Ask about the entire platform, its verified metrics, and analysis results.",
    online: "Online",
    globalView: "Global business view",
    verifiedData: "Based on platform data",
    welcomeTitle: "Your business, understood.",
    welcomeDescription: "Ask a question about performance, revenue, customers, products, or trends. I’ll connect the answer to the data available across Energical.",
    suggestions: "Suggested prompts",
    prompts: {
      upload: ["Summarize the quality checks", "List the applied transformations", "Which rules remain deferred?"],
      default: ["What are our most important KPIs?", "Which products perform best?", "What are the main trends?"],
    },
    placeholder: "Ask anything about your business data…",
    send: "Send question",
    thinking: "Reviewing the platform data…",
    errorTitle: "I couldn’t complete that analysis",
    errorDescription: "The analysis is temporarily unavailable. Please try again in a moment.",
    retry: "Try again",
    keyboardHint: "Enter to send · Shift + Enter for a new line",
  },
  fr: {
    close: "Fermer le panneau",
    insightEyebrow: "Exploration contextuelle",
    investigate: "Poursuivre l’exploration",
    askAi: "Demander à l’IA",
    assistantEyebrow: "Analyse métier",
    assistantTitle: "Energical AI",
    businessAnalyst: "Votre analyste métier intelligent",
    assistantDescription: "Posez une question sur toute la plateforme, ses indicateurs vérifiés et ses résultats d’analyse.",
    online: "En ligne",
    globalView: "Vue métier globale",
    verifiedData: "Basé sur les données de la plateforme",
    welcomeTitle: "Votre activité, enfin lisible.",
    welcomeDescription: "Interrogez les performances, les revenus, les clients, les produits ou les tendances. Je relierai la réponse aux données disponibles dans Energical.",
    suggestions: "Questions suggérées",
    prompts: {
      upload: ["Résumer les contrôles qualité", "Lister les transformations appliquées", "Quelles règles restent différées ?"],
      default: ["Quels sont nos KPI les plus importants ?", "Quels produits sont les plus performants ?", "Quelles sont les principales tendances ?"],
    },
    placeholder: "Posez une question sur vos données métier…",
    send: "Envoyer la question",
    thinking: "Analyse des données de la plateforme…",
    errorTitle: "L’analyse n’a pas pu aboutir",
    errorDescription: "L’analyse est momentanément indisponible. Veuillez réessayer dans quelques instants.",
    retry: "Réessayer",
    keyboardHint: "Entrée pour envoyer · Maj + Entrée pour une nouvelle ligne",
  },
  ar: {
    close: "إغلاق اللوحة",
    insightEyebrow: "استكشاف تحليلي",
    investigate: "متابعة التحليل",
    askAi: "اسأل المساعد",
    assistantEyebrow: "تحليل الأعمال",
    assistantTitle: "Energical AI",
    businessAnalyst: "مساعدك الذكي لتحليل الأعمال",
    assistantDescription: "اسأل عن كامل المنصة ومؤشراتها الموثّقة ونتائج التحليل.",
    online: "متصل",
    globalView: "رؤية شاملة للأعمال",
    verifiedData: "مبني على بيانات المنصة",
    welcomeTitle: "أصبحت بيانات أعمالك أوضح.",
    welcomeDescription: "اسأل عن الأداء أو الإيرادات أو العملاء أو المنتجات أو الاتجاهات، وسأربط الإجابة بالبيانات المتاحة في Energical.",
    suggestions: "أسئلة مقترحة",
    prompts: {
      upload: ["لخّص فحوصات الجودة", "ما التحويلات المطبقة؟", "ما النتائج المتاحة من خط التحليل؟"],
      default: ["ما أهم مؤشرات الأداء لدينا؟", "ما المنتجات الأفضل أداءً؟", "ما الاتجاهات الرئيسية؟"],
    },
    placeholder: "اسأل عن بيانات أعمالك…",
    send: "إرسال السؤال",
    thinking: "جارٍ تحليل بيانات المنصة…",
    errorTitle: "تعذّر إكمال التحليل",
    errorDescription: "التحليل غير متاح مؤقتًا. يُرجى المحاولة مرة أخرى بعد قليل.",
    retry: "حاول مجددًا",
    keyboardHint: "Enter للإرسال · Shift + Enter لسطر جديد",
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

  return createPortal(
    <div className={`context-drawer-backdrop ${className}`} onMouseDown={onClose}>
      <aside className="context-drawer" role="dialog" aria-modal="true" aria-label="Energical AI" onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className="context-drawer-close icon-button" onClick={onClose} aria-label={closeLabel}><X size={18} strokeWidth={1.8} /></button>
        {children}
      </aside>
    </div>,
    document.body,
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
      <div className="context-drawer-topline">
        <span className="context-drawer-icon context-drawer-icon--orange">
          <Sparkles size={17} />
        </span>
        <p className="panel-eyebrow">{insight.eyebrow || text.insightEyebrow}</p>
      </div>
      <h2>{insight.title}</h2>
      <p className="context-drawer-description">{insight.description || insight.subtitle}</p>

      <div className="context-metric-card">
        <span>{insight.metric_label || (language === "fr" ? "Indicateur Principal" : "Primary Indicator")}</span>
        <strong>{metric}</strong>
        <small>{insight.selection_label || insight.selection || ""}</small>
      </div>

      {insight.details && Object.keys(insight.details).length > 0 && (
        <div className="context-drawer-section">
          <p className="context-drawer-section-label">{language === "fr" ? "Attributs & Détails" : "Entity Details"}</p>
          <div className="context-details-grid">
            {Object.entries(insight.details).map(([key, val]) => (
              <div key={key} className="context-detail-card">
                <span className="context-detail-label">{key}</span>
                <strong className="context-detail-value">{String(val)}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="context-drawer-section">
        <p className="context-drawer-section-label">{text.investigate}</p>
        <div className="context-suggestion-list">
          {(insight.suggestions || []).map((suggestion) => (
            <button
              type="button"
              className="context-suggestion"
              key={suggestion.id}
              onClick={() => {
                onClose();
                onNavigate(suggestion.tabId, suggestion.context);
              }}
            >
              <span>{suggestion.label[language] || suggestion.label.en || suggestion.label}</span>
              <ArrowRight size={15} />
            </button>
          ))}
        </div>
      </div>

      <button type="button" className="context-ai-button" onClick={() => onAskAI(insight.aiContext || insight)}>
        <Bot size={17} />{text.askAi}
      </button>
    </DrawerFrame>
  );
}

function ContextualAssistantDrawer({ context, language = "en", onClose }) {
  const text = translations[language] || translations.en;
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [boundaryError, setBoundaryError] = useState(null);
  const conversationRef = useRef(null);
  const prompts = context?.page === "upload" ? text.prompts.upload : text.prompts.default;

  useEffect(() => {
    if (!context) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [context, onClose]);

  useEffect(() => {
    const conversation = conversationRef.current;
    if (!conversation) return;
    conversation.scrollTo({ top: conversation.scrollHeight, behavior: "smooth" });
  }, [messages, isSending, boundaryError]);

  if (!context) return null;

  const sendQuestion = async (value) => {
    const cleanQuestion = value.trim();
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
        interface_language: language,
        scope: "entire_platform",
        conversation: messages.slice(-8),
        query: cleanQuestion,
        question: cleanQuestion,
      });
      if (response?.status === "error") {
        setBoundaryError({ question: cleanQuestion });
        return;
      }
      if (response?.answer) {
        setMessages((current) => [...current, { role: "assistant", content: String(response.answer) }]);
      } else {
        setBoundaryError({ question: cleanQuestion });
      }
    } catch {
      setBoundaryError({ question: cleanQuestion });
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    void sendQuestion(question);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (question.trim() && !isSending) {
        void sendQuestion(question);
      }
    }
  };

  return (
    createPortal(
      <div className="assistant-layer" onMouseDown={onClose}>
        <section
          className="assistant-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="assistant-panel-title"
          dir={language === "ar" ? "rtl" : "ltr"}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <header className="assistant-panel-header">
            <div className="assistant-panel-identity">
              <span className="assistant-panel-avatar" aria-hidden="true">
                <Bot size={21} strokeWidth={2} />
                <i />
              </span>
              <div>
                <p className="assistant-panel-eyebrow">{text.assistantEyebrow}</p>
                <h2 id="assistant-panel-title">{text.assistantTitle}</h2>
                <span>{text.businessAnalyst}</span>
              </div>
            </div>
            <button type="button" className="assistant-panel-close" onClick={onClose} aria-label={text.close}>
              <X size={18} strokeWidth={1.9} />
            </button>
          </header>

          <div className="assistant-panel-status" aria-label={`${text.online} · ${text.globalView}`}>
            <span className="assistant-online-dot" aria-hidden="true" />
            <span>{text.online}</span>
            <span className="assistant-status-divider" aria-hidden="true" />
            <span>{text.globalView}</span>
          </div>

          <div className="assistant-conversation" ref={conversationRef} aria-live="polite">
            {!messages.length && !isSending && (
              <div className="assistant-welcome">
                <span className="assistant-welcome-icon" aria-hidden="true"><Bot size={25} strokeWidth={1.8} /></span>
                <h3>{text.welcomeTitle}</h3>
                <p>{text.welcomeDescription}</p>
              </div>
            )}

            {messages.map((message, index) => (
              <AssistantMessage
                key={`${message.role}-${index}`}
                role={message.role}
                content={message.content}
                language={language}
                verifiedLabel={text.verifiedData}
              />
            ))}

            {isSending && <AssistantTypingIndicator label={text.thinking} />}

            {boundaryError && (
              <div className="assistant-error" role="alert">
                <span className="assistant-error-icon" aria-hidden="true"><CircleAlert size={17} /></span>
                <div>
                  <strong>{text.errorTitle}</strong>
                  <p>{text.errorDescription}</p>
                  <button type="button" onClick={() => void sendQuestion(boundaryError.question)} disabled={isSending}>
                    <RotateCcw size={14} />{text.retry}
                  </button>
                </div>
              </div>
            )}
          </div>

          {!messages.length && !isSending && (
            <div className="assistant-suggestions">
              <span>{text.suggestions}</span>
              <div>
                {prompts.map((prompt) => (
                  <button type="button" key={prompt} onClick={() => setQuestion(prompt)}>
                    <span>{prompt}</span><ArrowRight size={14} aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <form className="assistant-composer" onSubmit={handleSubmit}>
            <div className="assistant-input-wrap">
              <label className="sr-only" htmlFor="assistant-question">{text.placeholder}</label>
              <textarea
                id="assistant-question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={text.placeholder}
                rows={1}
                disabled={isSending}
              />
              <button type="submit" disabled={!question.trim() || isSending} aria-label={text.send}>
                <Send size={17} strokeWidth={2} />
              </button>
            </div>
            <p className="assistant-keyboard-hint">{text.keyboardHint}</p>
          </form>
        </section>
      </div>,
      document.body,
    )
  );
}

export { ContextualAssistantDrawer, ContextualInsightDrawer };
