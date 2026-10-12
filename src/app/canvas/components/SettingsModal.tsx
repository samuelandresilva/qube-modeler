import { useTranslation } from "react-i18next";
import { CanvasModal } from "./CanvasModal";
import { setLanguage, type SupportedLanguage } from "@/locales/i18n";
import { Globe, HardDrive } from "lucide-react";

type SettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { t, i18n } = useTranslation("common");

  if (!isOpen) return null;

  const currentLang = (i18n.language as SupportedLanguage) || "en";

  const handleLanguageChange = (lang: SupportedLanguage) => {
    void setLanguage(lang);
  };

  return (
    <CanvasModal
      title={t("settings.title")}
      onClose={onClose}
      elevated
      className="canvas-modal--settings"
    >
      <div className="canvas-modal-form">
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "8px",
            }}
          >
            <Globe size={16} color="var(--color-primary, #3b82f6)" />
            <span
              style={{
                fontSize: "12px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--color-text-muted)",
              }}
            >
              {t("settings.general")}
            </span>
          </div>

          <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "14px", fontWeight: 600 }}>
              {t("settings.language")}
            </span>
            <select
              value={currentLang}
              onChange={(e) => handleLanguageChange(e.target.value as SupportedLanguage)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "var(--radius-md)",
                background: "var(--color-surface, #1e293b)",
                color: "var(--color-text, #f8fafc)",
                border: "1px solid var(--color-border, #334155)",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              <option value="en">English (US)</option>
              <option value="pt-BR">Português (Brasil)</option>
            </select>
            <span
              style={{
                fontSize: "12px",
                color: "var(--color-text-muted)",
                marginTop: "2px",
              }}
            >
              {t("settings.languageDescription")}
            </span>
          </label>
        </div>

        <div
          style={{
            padding: "12px",
            borderRadius: "var(--radius-md)",
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid var(--color-border, rgba(255, 255, 255, 0.08))",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "4px",
            }}
          >
            <HardDrive size={15} color="var(--color-text-muted)" />
            <span style={{ fontSize: "13px", fontWeight: 600 }}>
              {t("settings.storageLocation")}
            </span>
          </div>
          <p
            style={{
              fontSize: "12px",
              color: "var(--color-text-muted)",
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            {t("settings.storageDescription")}
          </p>
          <code
            style={{
              display: "block",
              marginTop: "8px",
              fontSize: "11px",
              color: "#38bdf8",
              fontFamily: "monospace",
              background: "rgba(0, 0, 0, 0.25)",
              padding: "6px 8px",
              borderRadius: "4px",
              wordBreak: "break-all",
            }}
          >
            %APPDATA%\qube-modeler\settings.json
          </code>
        </div>

        <div
          style={{
            fontSize: "11px",
            color: "var(--color-text-muted)",
            fontStyle: "italic",
          }}
        >
          {t("settings.shortcut")}
        </div>

        <div className="canvas-modal-actions" style={{ marginTop: "4px" }}>
          <button type="button" onClick={onClose} style={{ minWidth: "90px" }}>
            {t("settings.close")}
          </button>
        </div>
      </div>
    </CanvasModal>
  );
}
