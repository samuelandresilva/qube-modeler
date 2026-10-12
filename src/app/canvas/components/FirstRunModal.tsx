import { useState } from "react";
import { useTranslation } from "react-i18next";
import qubeIcon from "@/assets/qube-modeler-icon.png";
import type { SupportedLanguage } from "@/locales/i18n";

type FirstRunModalProps = {
  onComplete: (language: SupportedLanguage) => void;
};

export function FirstRunModal({ onComplete }: FirstRunModalProps) {
  const { t, i18n } = useTranslation("common");
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(
    (i18n.language as SupportedLanguage) || "en"
  );

  const handleLanguageChange = (lang: SupportedLanguage) => {
    setSelectedLanguage(lang);
    void i18n.changeLanguage(lang);
  };

  const handleConfirm = () => {
    onComplete(selectedLanguage);
  };

  return (
    <div className="canvas-modal-backdrop canvas-modal-backdrop--elevated">
      <div
        className="canvas-modal"
        style={{
          maxWidth: "420px",
          width: "90%",
          padding: "8px",
          borderRadius: "var(--radius-lg)",
        }}
      >
        <div style={{ padding: "20px 24px", textAlign: "center" }}>
          <img
            src={qubeIcon}
            alt="Qube Modeler"
            style={{ width: "48px", height: "48px", marginBottom: "12px" }}
          />
          <h2 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 8px 0" }}>
            {t("firstRun.title")}
          </h2>
          <p
            style={{
              fontSize: "13px",
              color: "var(--color-text-muted)",
              margin: "0 0 24px 0",
              lineHeight: 1.5,
            }}
          >
            {t("firstRun.subtitle")}
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              textAlign: "left",
              marginBottom: "28px",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "14px 16px",
                borderRadius: "var(--radius-md)",
                background:
                  selectedLanguage === "en"
                    ? "var(--color-primary-dim, rgba(59, 130, 246, 0.15))"
                    : "var(--color-surface, rgba(255, 255, 255, 0.03))",
                border:
                  selectedLanguage === "en"
                    ? "1px solid var(--color-primary, #3b82f6)"
                    : "1px solid var(--color-border, rgba(255, 255, 255, 0.1))",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <input
                type="radio"
                name="firstRunLanguage"
                value="en"
                checked={selectedLanguage === "en"}
                onChange={() => handleLanguageChange("en")}
                style={{ cursor: "pointer", margin: 0 }}
              />
              <span style={{ fontSize: "14px", fontWeight: 600 }}>
                English
              </span>
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "14px 16px",
                borderRadius: "var(--radius-md)",
                background:
                  selectedLanguage === "pt-BR"
                    ? "var(--color-primary-dim, rgba(59, 130, 246, 0.15))"
                    : "var(--color-surface, rgba(255, 255, 255, 0.03))",
                border:
                  selectedLanguage === "pt-BR"
                    ? "1px solid var(--color-primary, #3b82f6)"
                    : "1px solid var(--color-border, rgba(255, 255, 255, 0.1))",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <input
                type="radio"
                name="firstRunLanguage"
                value="pt-BR"
                checked={selectedLanguage === "pt-BR"}
                onChange={() => handleLanguageChange("pt-BR")}
                style={{ cursor: "pointer", margin: 0 }}
              />
              <span style={{ fontSize: "14px", fontWeight: 600 }}>
                Português (Brasil)
              </span>
            </label>
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            className="canvas-welcome__btn canvas-welcome__btn--primary"
            style={{
              width: "100%",
              justifyContent: "center",
              padding: "10px",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            {t("firstRun.getStarted")}
          </button>
        </div>
      </div>
    </div>
  );
}
