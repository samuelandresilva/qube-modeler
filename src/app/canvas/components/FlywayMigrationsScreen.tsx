import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import type { QbmFile, QbmFlywayVersion } from "@/core/qbm/qbm-file";
import {
  getFlywayVersions,
  getLastFlywayVersion,
} from "@/core/qbm/qbm-flyway";
import { diffProjects } from "@/core/diff/project-diff";
import type { ProjectDiff } from "@/core/diff/project-diff-types";
import { generatePostgresMigrationSql } from "@/core/migration/postgres-migration-generator";
import { FlywayMigrationsTable } from "./FlywayMigrationsTable";
import { FlywayMigrationsDetails } from "./FlywayMigrationsDetails";
import "../styles/FlywayMigrationsScreen.css";

type FlywayMigrationsScreenProps = {
  qbmFile: QbmFile;
  onBack: () => void;
};

type PreviewState = {
  sql: string;
  diff: ProjectDiff;
  error: string | null;
  noChanges: boolean;
};

export function FlywayMigrationsScreen({
  qbmFile,
  onBack,
}: FlywayMigrationsScreenProps) {
  const [selectedVersion, setSelectedVersion] = useState<QbmFlywayVersion | null>(null);
  const [previewData, setPreviewData] = useState<PreviewState | null>(null);

  const versions = getFlywayVersions(qbmFile);
  const lastVersion = getLastFlywayVersion(qbmFile);
  const totalCount = versions.length;

  const handleGenerateMigration = () => {
    if (!lastVersion) return;

    try {
      const diff = diffProjects(lastVersion.projectSnapshot, qbmFile.project);

      const noChanges = diff.operations.length === 0 && diff.unsupportedOperations.length === 0;

      if (noChanges) {
        setPreviewData({
          sql: "",
          diff,
          error: null,
          noChanges: true,
        });
        return;
      }

      // Se houver mudanças não suportadas, bloqueamos a geração do SQL e exibimos os avisos
      if (diff.unsupportedOperations.length > 0) {
        setPreviewData({
          sql: "",
          diff,
          error: null,
          noChanges: false,
        });
        return;
      }

      // Senão, geramos o SQL incremental com segurança
      const sql = generatePostgresMigrationSql(diff, qbmFile.project);
      setPreviewData({
        sql,
        diff,
        error: null,
        noChanges: false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error occurred.";
      setPreviewData({
        sql: "",
        diff: { operations: [], unsupportedOperations: [] },
        error: msg,
        noChanges: false,
      });
    }
  };

  return (
    <div className="flyway-screen">
      <header className="flyway-header">
        <div className="flyway-header__left">
          <button
            className="flyway-back-button"
            onClick={onBack}
            title="Back to canvas"
            type="button"
          >
            <ArrowLeft size={18} strokeWidth={2.4} />
            <span>Back to canvas</span>
          </button>
          <div className="flyway-header__title-container">
            <h1 className="flyway-header__title">Flyway Migrations</h1>
            <p className="flyway-header__subtitle">
              Manage database schema migrations and history snapshots.
            </p>
          </div>
        </div>
      </header>

      <main className="flyway-main-content">
        <div className="flyway-layout-container">
          <div className="flyway-layout-grid">
            <div className="flyway-column-left">
              <FlywayMigrationsTable
                versions={versions}
                selectedVersion={selectedVersion}
                onSelectVersion={setSelectedVersion}
              />
            </div>
            <div className="flyway-column-right">
              {previewData ? (
                <div className="flyway-details-panel">
                  <div className="flyway-details-header">
                    <span className="flyway-details-badge">Migration Preview</span>
                    <h3 className="flyway-details-title">SQL Migration Details</h3>
                  </div>

                  <div className="flyway-preview-meta-info">
                    <div className="flyway-preview-meta-row">
                      <span className="flyway-preview-meta-label">Base Migration:</span>
                      <span className="flyway-preview-meta-value">{lastVersion?.fileName}</span>
                    </div>
                    <div className="flyway-preview-meta-row">
                      <span className="flyway-preview-meta-label">Supported Ops:</span>
                      <span className="flyway-preview-meta-value">{previewData.diff.operations.length}</span>
                    </div>
                    <div className="flyway-preview-meta-row">
                      <span className="flyway-preview-meta-label">Unsupported Ops:</span>
                      <span className={`flyway-preview-meta-value ${previewData.diff.unsupportedOperations.length > 0 ? "flyway-preview-meta-value--warning" : ""}`}>
                        {previewData.diff.unsupportedOperations.length}
                      </span>
                    </div>
                  </div>

                  {previewData.noChanges && (
                    <div className="flyway-preview-message flyway-preview-message--info">
                      <strong>No pending changes</strong>
                      <p>No changes detected between the last migration snapshot and the current model.</p>
                    </div>
                  )}

                  {previewData.error && (
                    <div className="flyway-preview-message flyway-preview-message--error">
                      <strong>Generation Error</strong>
                      <p>{previewData.error}</p>
                    </div>
                  )}

                  {previewData.diff.unsupportedOperations.length > 0 && (
                    <div className="flyway-preview-message flyway-preview-message--warning">
                      <strong>Unsupported Changes Detected</strong>
                      <p>The following changes are unsupported in migrations (requires manual action):</p>
                      <ul className="flyway-unsupported-list">
                        {previewData.diff.unsupportedOperations.map((op, idx) => (
                          <li key={idx}>
                            [{op.objectType}] {op.objectName} - {op.reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {previewData.sql && (
                    <div className="flyway-sql-preview-container">
                      <span className="flyway-details-label">Generated SQL Preview</span>
                      <pre className="flyway-sql-preview">
                        <code>{previewData.sql}</code>
                      </pre>
                    </div>
                  )}

                  <div className="flyway-details-actions">
                    <button
                      className="flyway-button flyway-button--secondary"
                      type="button"
                      onClick={() => setPreviewData(null)}
                    >
                      Close preview
                    </button>
                    <button
                      className="flyway-button flyway-button--primary"
                      type="button"
                      disabled
                    >
                      Confirm migration
                    </button>
                  </div>
                </div>
              ) : (
                <FlywayMigrationsDetails
                  totalCount={totalCount}
                  lastVersion={lastVersion}
                  selectedVersion={null}
                  onGenerateMigration={handleGenerateMigration}
                />
              )}
            </div>
          </div>

          {selectedVersion && (
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
                  <span className="flyway-details-value">
                    {new Date(selectedVersion.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flyway-selected-details-actions">
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
          )}
        </div>
      </main>
    </div>
  );
}
