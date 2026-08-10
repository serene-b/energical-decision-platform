import ModuleState from "../components/Common/ModuleState.jsx";

const translations = {
  en: {
    eyebrow: "Customer behavior",
    title: "Behavior intelligence is not connected yet",
    description:
      "This space is reserved for approved traffic, journey, acquisition, and conversion metrics when the corresponding source is available.",
    statusLabel: "Integration shell",
  },
  fr: {
    eyebrow: "Comportement client",
    title: "L’intelligence comportementale n’est pas encore connectée",
    description:
      "Cet espace accueillera les indicateurs approuvés de trafic, de parcours, d’acquisition et de conversion lorsque leur source sera disponible.",
    statusLabel: "Structure d’intégration",
  },
};

function CustomerBehavior({ language = "en" }) {
  const text = translations[language] || translations.en;

  return <ModuleState {...text} status="planned" />;
}

export default CustomerBehavior;
