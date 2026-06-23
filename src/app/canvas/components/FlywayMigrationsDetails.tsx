import type { QbmFlywayVersion } from "@/core/qbm/qbm-file";

type FlywayMigrationsDetailsProps = {
  totalCount: number;
  lastVersion: QbmFlywayVersion | null;
  selectedVersion: QbmFlywayVersion | null;
};

export function FlywayMigrationsDetails({
  totalCount,
  lastVersion,
  selectedVersion,
}: FlywayMigrationsDetailsProps) {
  if (totalCount === 0) {
    return (
      <div className="flyway-details-panel">
        <h3 className="flyway-details-title">No migrations yet</h3>
        <p className="flyway-details-text">
          Create the first Flyway migration from the current model.
        </p>
        <div className="flyway-details-actions">
          <button className="flyway-button flyway-button--primary" type="button">
            Create initial migration
          </button>
        </div>
      </div>
    );
  }

  if (selectedVersion) {
    const formattedDate = new Date(selectedVersion.createdAt).toLocaleString();
    return (
      <div className="flyway-details-panel">
        <div className="flyway-details-header">
          <span className="flyway-details-badge">Migration Selected</span>
          <h3 className="flyway-details-title">{selectedVersion.fileName}</h3>
        </div>

        <div className="flyway-details-grid">
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

        <div className="flyway-details-actions">
          <button
            className="flyway-button flyway-button--secondary"
            type="button"
            disabled
          >
            View SQL
          </button>
          <button
            className="flyway-button flyway-button--secondary"
            type="button"
            disabled
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
        <button className="flyway-button flyway-button--primary" type="button">
          Generate next migration
        </button>
      </div>
    </div>
  );
}
