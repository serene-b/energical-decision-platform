function StatusBadge({ status = "neutral", children }) {
  return (
    <span className={`status-badge status-badge--${status}`}>
      {children}
    </span>
  );
}

export default StatusBadge;
