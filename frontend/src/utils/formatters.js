export function formatNumber(value, language = "en") {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return new Intl.NumberFormat(
    language === "fr" ? "fr-DZ" : "en-US",
  ).format(value);
}

export function formatDateTime(value, language = "en") {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    language === "fr" ? "fr-DZ" : "en-DZ",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
}

export function formatDateRange(min, max, language = "en") {
  if (!min && !max) {
    return "—";
  }

  if (min === max || !max) {
    return formatDateTime(min, language);
  }

  return `${formatDateTime(min, language)} – ${formatDateTime(max, language)}`;
}

export function formatFileSize(bytes, language = "en") {
  if (!Number.isFinite(bytes)) {
    return "—";
  }

  if (bytes < 1024) {
    return `${bytes} ${language === "fr" ? "octets" : "bytes"}`;
  }

  const units = language === "fr" ? ["Ko", "Mo", "Go"] : ["KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = -1;

  do {
    size /= 1024;
    unitIndex += 1;
  } while (size >= 1024 && unitIndex < units.length - 1);

  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}
