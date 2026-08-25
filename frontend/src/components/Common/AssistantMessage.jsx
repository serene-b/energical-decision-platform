import { Bot, CheckCircle2, LoaderCircle } from "lucide-react";

import { AssistantMarkdown } from "./AssistantMarkdown.jsx";

function AssistantMessage({ role, content, language = "en", verifiedLabel = "Based on platform data" }) {
  const isUser = role === "user";
  const direction = language === "ar" ? "rtl" : "ltr";

  return (
    <div className={`assistant-message-row assistant-message-row--${isUser ? "user" : "assistant"}`} dir={direction}>
      {!isUser && (
        <span className="assistant-message-avatar" aria-hidden="true">
          <Bot size={16} strokeWidth={2} />
        </span>
      )}
      {isUser ? (
        <div className="assistant-message-bubble assistant-message-bubble--user">{content}</div>
      ) : (
        <article className="assistant-message-card">
          <div className="assistant-message-source">
            <CheckCircle2 size={13} strokeWidth={2.2} />
            <span>{verifiedLabel}</span>
          </div>
          <AssistantMarkdown content={content} />
        </article>
      )}
    </div>
  );
}

function AssistantTypingIndicator({ label }) {
  return (
    <div className="assistant-message-row assistant-message-row--assistant assistant-message-row--typing" role="status" aria-label={label}>
      <span className="assistant-message-avatar" aria-hidden="true">
        <Bot size={16} strokeWidth={2} />
      </span>
      <div className="assistant-typing-card">
        <span className="assistant-typing-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <LoaderCircle className="assistant-typing-spinner" size={14} aria-hidden="true" />
      </div>
    </div>
  );
}

export { AssistantMessage, AssistantTypingIndicator };
