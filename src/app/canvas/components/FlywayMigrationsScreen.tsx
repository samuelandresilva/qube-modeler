import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import type { QbmFile, QbmFlywayVersion } from "@/core/qbm/qbm-file";
import {
  getFlywayVersions,
  getLastFlywayVersion,
  buildFlywayFileName,
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
  onConfirmMigration: (newVersion: QbmFlywayVersion) => void;
};

type PreviewState = {
  sql: string;
  diff: ProjectDiff;
  error: string | null;
  noChanges: boolean;
};

function suggestNextVersion(lastVersionStr: string): string {
  const match = lastVersionStr.match(/^0*(\d+)$/);
  if (match) {
    const num = parseInt(match[1], 10) + 1;
    return String(num).padStart(Math.max(3, lastVersionStr.length), "0");
  }
  const numOnly = parseInt(lastVersionStr.replace(/\D/g, ""), 10);
  if (!isNaN(numOnly)) {
    return String(numOnly + 1).padStart(3, "0");
  }
  return "001";
}

function cryptoUuid(): string {
  if (typeof window !== "undefined" && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function FlywayMigrationsScreen({
  qbmFile,
  onBack,
  onConfirmMigration,
}: FlywayMigrationsScreenProps) {
  const [selectedVersion, setSelectedVersion] = useState<QbmFlywayVersion | null>(null);
  const [previewData, setPreviewData] = useState<PreviewState | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [versionInput, setVersionInput] = useState("");
  const [descriptionInput, setDescriptionInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

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

      if (diff.unsupportedOperations.length > 0) {
        setPreviewData({
          sql: "",
          diff,
          error: null,
          noChanges: false,
        });
        return;
      }

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

  const handleOpenConfirmForm = () => {
    if (!previewData || previewData.sql === "" || previewData.diff.operations.length === 0 || previewData.diff.unsupportedOperations.length > 0) {
      return;
    }
    const nextVer = lastVersion ? suggestNextVersion(lastVersion.version) : "001";
    setVersionInput(nextVer);
    setDescriptionInput("migration");
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleConfirmSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ver = versionInput.trim();
    const desc = descriptionInput.trim();

    if (!ver) {
      setFormError("Version is required.");
      return;
    }
    if (!desc) {
      setFormError("Description is required.");
      return;
    }

    const computedFileName = buildFlywayFileName(ver, desc);

    const versionExists = versions.some((v) => v.version === ver);
    if (versionExists) {
      setFormError(`Version "${ver}" already exists in migrations history.`);
      return;
    }

    const fileNameExists = versions.some((v) => v.fileName === computedFileName);
    if (fileNameExists) {
      setFormError(`File name "${computedFileName}" already exists in migrations history.`);
      return;
    }

    if (!previewData || !previewData.sql) {
      setFormError("No generated SQL to confirm.");
      return;
    }

    // Criar nova versão de migration congelada
    const newMigration: QbmFlywayVersion = {
      id: cryptoUuid(),
      version: ver,
      description: desc,
      fileName: computedFileName,
      createdAt: new Date().toISOString(),
      projectSnapshot: JSON.parse(JSON.stringify(qbmFile.project)),
      generatedSql: previewData.sql,
    };

    onConfirmMigration(newMigration);

    // Resetar estados
    setPreviewData(null);
    setIsFormOpen(false);
    setSelectedVersion(null);
  };

  const handleExportSql = async () => {
    if (!selectedVersion) return;
    if (!selectedVersion.generatedSql) {
      alert("This migration does not contain any generated SQL.");
      return;
    }

    try {
      const api = window.qubeModeler;
      if (!api) {
        alert("Electron API is not available.");
        return;
      }

      const result = await api.exportMigrationSql({
        fileName: selectedVersion.fileName,
        sql: selectedVersion.generatedSql,
      });

      if (result && !result.canceled && "error" in result && result.error) {
        alert(result.error);
      }
    } catch (error) {
      alert(`Error exporting migration: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Botão Confirmar habilitado se houver preview válido, sem erros e sem operações não suportadas
  const isConfirmEnabled =
    previewData &&
    previewData.sql !== "" &&
    previewData.diff.operations.length > 0 &&
    previewData.diff.unsupportedOperations.length === 0 &&
    !previewData.error;

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
              {isFormOpen && previewData ? (
                <form onSubmit={handleConfirmSubmit} className="flyway-details-panel">
                  <div className="flyway-details-header">
                    <span className="flyway-details-badge">Confirm Migration</span>
                    <h3 className="flyway-details-title">Define Migration Metadata</h3>
                  </div>

                  <div className="flyway-form-body">
                    <div className="flyway-form-field">
                      <label className="flyway-details-label" htmlFor="migration-version">Version</label>
                      <input
                        id="migration-version"
                        type="text"
                        className="flyway-search-input"
                        placeholder="e.g. 002"
                        value={versionInput}
                        onChange={(e) => {
                          setVersionInput(e.target.value);
                          setFormError(null);
                        }}
                      />
                    </div>

                    <div className="flyway-form-field">
                      <label className="flyway-details-label" htmlFor="migration-desc">Description</label>
                      <input
                        id="migration-desc"
                        type="text"
                        className="flyway-search-input"
                        placeholder="e.g. add columns"
                        value={descriptionInput}
                        onChange={(e) => {
                          setDescriptionInput(e.target.value);
                          setFormError(null);
                        }}
                      />
                    </div>

                    <div className="flyway-preview-filename-box">
                      <span className="flyway-details-label">Target File Name</span>
                      <span className="flyway-preview-filename-value">
                        {buildFlywayFileName(versionInput, descriptionInput)}
                      </span>
                    </div>

                    {formError && (
                      <div className="flyway-preview-message flyway-preview-message--error">
                        <strong>Validation Error</strong>
                        <p>{formError}</p>
                      </div>
                    )}
                  </div>

                  <div className="flyway-details-actions">
                    <button
                      className="flyway-button flyway-button--secondary"
                      type="button"
                      onClick={() => {
                        setIsFormOpen(false);
                        setFormError(null);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      className="flyway-button flyway-button--primary"
                      type="submit"
                    >
                      Confirm and Save
                    </button>
                  </div>
                </form>
              ) : previewData ? (
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
                      onClick={handleOpenConfirmForm}
                      disabled={!isConfirmEnabled}
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
                  onClick={handleExportSql}
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
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
