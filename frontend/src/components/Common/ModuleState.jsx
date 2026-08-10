import ScrollReveal from "./ScrollReveal.jsx";

function ModuleState({
  eyebrow,
  title,
  description,
  status = "planned",
  statusLabel,
}) {
  return (
    <section className="page-shell module-state-page" aria-label={title}>
      <ScrollReveal>
        <article className="module-state-card">
          <div className={`module-state-icon module-state-icon--${status}`} aria-hidden="true">
            <span />
          </div>

          <p className="section-eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          <p className="section-description">{description}</p>

          <span className="module-state-label">
            {statusLabel || (status === "planned" ? "Integration shell" : "Awaiting data")}
          </span>
        </article>
      </ScrollReveal>
    </section>
  );
}

export default ModuleState;
