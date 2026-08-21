import type { QbmFlywayVersion } from "@/core/qbm/qbm-file";

type FlywayMigrationsDetailsProps = {
  totalCount: number;
  lastVersion: QbmFlywayVersion | null;
  selectedVersion: QbmFlywayVersion | null;
  onGenerateMigration?: () => void;
  onGenerateInitialMigration?: () => void;
  hasContent?: boolean;
  onViewSql?: () => void;
  onExportSql?: () => void;
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
}: FlywayMigrationsDetailsProps) {
  if (totalCount === 0) {
    return (
      <div className="flyway-details-panel">
        <h3 className="flyway-details-title">No migrations yet</h3>
        <p className="flyway-details-text">
          Create the first Flyway migration from the current model.
        </p>
        <div className="flyway-details-actions">
          <button
            className="flyway-button flyway-button--primary"
            type="button"
            onClick={onGenerateInitialMigration}
            disabled={!hasContent}
          >
            Create initial migration
          </button>
        </div>
      </div>
    );
  }

  if (selectedVersion) {
    const formattedDate = new Date(selectedVersion.createdAt).toLocaleString();
    
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
          <span className="flyway-details-badge">Migration Selected</span>
          <h3 className="flyway-details-title">{selectedVersion.fileName}</h3>
        </div>

        <div className="flyway-selected-details-grid">
          <div className="flyway-details-field">
            <span className="flyway-details-label">Version</span>
            <span className="flyway-details-value">{selectedVersion.version}</span>
          </div>
          <div className="flyway-details-field">
            <span className="flyway-details-label">Description</span>
            <span className="flyway-details-value">{selectedVersion.description}</span>
          </div>
          <div className="flyway-details-field">
            <span className="flyway-details-label">Created At</span>
            <span className="flyway-details-value">{formattedDate}</span>
          </div>
        </div>

        <div className="flyway-selected-details-actions">
          <button
            className="flyway-button flyway-button--secondary"
            type="button"
            onClick={onViewSql}
            disabled={!selectedVersion.generatedSql}
          >
            View SQL
          </button>
          <button
            className="flyway-button flyway-button--secondary"
            type="button"
            onClick={onExportSql}
            disabled={!selectedVersion.generatedSql}
          >
            Export SQL
          </button>
          <button
            className="flyway-button flyway-button--secondary"
            type="button"
            disabled
          >
            View snapshot
          </button>
        </div>

        {/* Seção Manual Scripts (Apenas Leitura) */}
        <div className="flyway-manual-scripts-section">
          <div className="flyway-manual-scripts-header">
            <h4 className="flyway-manual-scripts-title">Manual scripts</h4>
          </div>

          {sortedScripts.length === 0 ? (
            <p className="flyway-manual-scripts-empty">
              No manual scripts configured for this migration.
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
                    <span className="flyway-manual-script-item__order">Order: {script.order}</span>
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
      <h3 className="flyway-details-title">Overview</h3>
      
      <div className="flyway-details-grid">
        <div className="flyway-details-field">
          <span className="flyway-details-label">Total Migrations</span>
          <span className="flyway-details-value">{totalCount}</span>
        </div>
        {lastVersion && (
          <div className="flyway-details-field">
            <span className="flyway-details-label">Last Migration</span>
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
          Generate next migration
        </button>
      </div>
    </div>
  );
}
