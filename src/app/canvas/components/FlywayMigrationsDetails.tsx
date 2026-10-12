import { useTranslation } from "react-i18next";
import type { QbmFlywayVersion } from "@/core/qbm/qbm-file";
import type { FlywayHistoryRecord } from "@/core/qbm/ipc-types";

type FlywayMigrationsDetailsProps = {
  totalCount: number;
  lastVersion: QbmFlywayVersion | null;
  selectedVersion: QbmFlywayVersion | null;
  onGenerateMigration?: () => void;
  onGenerateInitialMigration?: () => void;
  hasContent?: boolean;
  onViewSql?: () => void;
  onExportSql?: () => void;
  onSaveToDirectory?: () => void;
  onDeleteLastVersion?: () => void;
  isLastVersion?: boolean;
  hasMigrationsDirectory?: boolean;
  isSavedInDirectory?: boolean;
  dbRecord?: FlywayHistoryRecord;
};

export function FlywayMigrationsDetails({
  totalCount,
  lastVersion,
  selectedVersion,
  onGenerateMigration,
  onGenerateInitialMigration,
  hasContent = false,
  onViewSql,
  onExportSql,
  onSaveToDirectory,
  onDeleteLastVersion,
  isLastVersion = false,
  hasMigrationsDirectory = false,
  isSavedInDirectory = false,
  dbRecord,
}: FlywayMigrationsDetailsProps) {
  const { t, i18n } = useTranslation(["flyway", "common"]);

  if (totalCount === 0) {
    return (
      <div className="flyway-details-panel">
        <h3 className="flyway-details-title">{t("flyway:details.noMigrationsYet")}</h3>
        <p className="flyway-details-text">
          {t("flyway:details.noMigrationsYetText")}
        </p>
        <div className="flyway-details-actions">
          <button
            className="flyway-button flyway-button--primary"
            type="button"
            onClick={onGenerateInitialMigration}
            disabled={!hasContent}
          >
            {t("flyway:generator.generateInitial")}
          </button>
        </div>
      </div>
    );
  }

  if (selectedVersion) {
    const formattedDate = new Date(selectedVersion.createdAt).toLocaleString(i18n.language);
    
    // Sort manual scripts for rendering:
    // 1. execution = before, order ascending
    // 2. execution = after, order ascending
    const sortedScripts = [...(selectedVersion.manualScripts || [])].sort((a, b) => {
      if (a.execution !== b.execution) {
        return a.execution === "before" ? -1 : 1;
      }
      return a.order - b.order;
    });

    return (
      <div className="flyway-selected-details-panel">
        <div className="flyway-selected-details-header">
          <span className="flyway-details-badge">{t("flyway:details.migrationSelected")}</span>
          <h3 className="flyway-details-title">{selectedVersion.fileName}</h3>
        </div>

        <div className="flyway-selected-details-grid">
          <div className="flyway-details-field">
            <span className="flyway-details-label">{t("flyway:table.columns.version")}</span>
            <span className="flyway-details-value">{selectedVersion.version}</span>
          </div>
          <div className="flyway-details-field">
            <span className="flyway-details-label">{t("flyway:table.columns.description")}</span>
            <span className="flyway-details-value">{selectedVersion.description}</span>
          </div>
          <div className="flyway-details-field">
            <span className="flyway-details-label">{t("flyway:table.columns.createdAt")}</span>
            <span className="flyway-details-value">{formattedDate}</span>
          </div>
          {dbRecord && (
            <div className="flyway-details-field">
              <span className="flyway-details-label">{t("flyway:table.columns.dbStatus")}</span>
              <span className="flyway-details-value">
                {dbRecord.success ? (
                  <span style={{ color: "#10b981", fontWeight: 600 }}>
                    {t("flyway:table.status.applied")} ({new Date(dbRecord.installedOn).toLocaleString(i18n.language)})
                  </span>
                ) : (
                  <span style={{ color: "#ef4444", fontWeight: 600 }}>{t("flyway:details.executionFailed")}</span>
                )}
              </span>
            </div>
          )}
        </div>

        <div className="flyway-selected-details-actions">
          <button
            className="flyway-button flyway-button--secondary"
            type="button"
            onClick={onViewSql}
            disabled={!selectedVersion.generatedSql}
          >
            {t("flyway:details.viewSql")}
          </button>
          <button
            className="flyway-button flyway-button--secondary"
            type="button"
            onClick={onExportSql}
            disabled={!selectedVersion.generatedSql}
          >
            {t("flyway:details.exportAs")}
          </button>
          {hasMigrationsDirectory && onSaveToDirectory && (
            <button
              className="flyway-button flyway-button--secondary"
              type="button"
              onClick={onSaveToDirectory}
              disabled={!selectedVersion.generatedSql}
              title={t("flyway:details.saveToFolderTooltip")}
            >
              {isSavedInDirectory ? t("flyway:details.overwriteInFolder") : t("flyway:details.saveToFolder")}
            </button>
          )}
          {isLastVersion && onDeleteLastVersion && (
            <button
              className="flyway-button flyway-button--danger"
              type="button"
              onClick={onDeleteLastVersion}
              disabled={dbRecord?.success}
              title={
                dbRecord?.success
                  ? t("flyway:details.cannotDeleteApplied")
                  : t("flyway:details.deleteTooltip")
              }
            >
              {t("flyway:details.deleteMigration")}
            </button>
          )}
        </div>

        {/* Seção Manual Scripts (Apenas Leitura) */}
        <div className="flyway-manual-scripts-section">
          <div className="flyway-manual-scripts-header">
            <h4 className="flyway-manual-scripts-title">{t("flyway:details.manualScripts")}</h4>
          </div>

          {sortedScripts.length === 0 ? (
            <p className="flyway-manual-scripts-empty">
              {t("flyway:details.noManualScripts")}
            </p>
          ) : (
            <div className="flyway-manual-scripts-list">
              {sortedScripts.map((script) => (
                <div key={script.id} className="flyway-manual-script-item">
                  <div className="flyway-manual-script-item__info">
                    <span className="flyway-manual-script-item__name">{script.name}</span>
                    <span className={`flyway-manual-script-item__badge flyway-manual-script-item__badge--${script.execution}`}>
                      {script.execution}
                    </span>
                    <span className="flyway-manual-script-item__order">{t("flyway:details.order", { order: script.order })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flyway-details-panel">
      <h3 className="flyway-details-title">{t("flyway:details.overview")}</h3>
      
      <div className="flyway-details-grid">
        <div className="flyway-details-field">
          <span className="flyway-details-label">{t("flyway:details.totalMigrations")}</span>
          <span className="flyway-details-value">{totalCount}</span>
        </div>
        {lastVersion && (
          <div className="flyway-details-field">
            <span className="flyway-details-label">{t("flyway:details.lastMigration")}</span>
            <span className="flyway-details-value">
              {lastVersion.version} ({lastVersion.description})
            </span>
          </div>
        )}
      </div>

      <div className="flyway-details-actions">
        <button
          className="flyway-button flyway-button--primary"
          type="button"
          onClick={onGenerateMigration}
        >
          {t("flyway:generator.generateNext")}
        </button>
      </div>
    </div>
  );
}
