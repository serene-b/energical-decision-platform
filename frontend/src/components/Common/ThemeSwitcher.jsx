import { Moon, Sun } from "lucide-react";

const labels = {
  en: {
    theme: "Theme",
    light: "Light theme",
    dark: "Dark theme",
  },
  fr: {
    theme: "Thème",
    light: "Thème clair",
    dark: "Thème sombre",
  },
};

function ThemeSwitcher({ language = "en", theme, onThemeChange }) {
  const text = labels[language] || labels.en;

  return (
    <div className="compact-segmented-control compact-theme-control" role="group" aria-label={text.theme}>
      <button
        type="button"
        aria-label={text.light}
        aria-pressed={theme === "light"}
        className={theme === "light" ? "is-active" : ""}
        onClick={() => onThemeChange("light")}
      >
        <Sun size={15} strokeWidth={1.9} aria-hidden="true" />
        <span>{language === "fr" ? "Clair" : "Light"}</span>
      </button>
      <button
        type="button"
        aria-label={text.dark}
        aria-pressed={theme === "dark"}
        className={theme === "dark" ? "is-active" : ""}
        onClick={() => onThemeChange("dark")}
      >
        <Moon size={15} strokeWidth={1.9} aria-hidden="true" />
        <span>{language === "fr" ? "Sombre" : "Dark"}</span>
      </button>
    </div>
  );
}

export default ThemeSwitcher;
