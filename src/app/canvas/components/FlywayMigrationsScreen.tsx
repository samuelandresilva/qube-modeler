import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import type { QbmFile, QbmFlywayVersion } from "@/core/qbm/qbm-file";
import {
  getFlywayVersions,
  getLastFlywayVersion,
} from "@/core/qbm/qbm-flyway";
import { FlywayMigrationsTable } from "./FlywayMigrationsTable";
import { FlywayMigrationsDetails } from "./FlywayMigrationsDetails";
import "../styles/FlywayMigrationsScreen.css";

type FlywayMigrationsScreenProps = {
  qbmFile: QbmFile;
  onBack: () => void;
};

export function FlywayMigrationsScreen({
  qbmFile,
  onBack,
}: FlywayMigrationsScreenProps) {
  const [selectedVersion, setSelectedVersion] = useState<QbmFlywayVersion | null>(null);

  const versions = getFlywayVersions(qbmFile);
  const lastVersion = getLastFlywayVersion(qbmFile);
  const totalCount = versions.length;

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
              <FlywayMigrationsDetails
                totalCount={totalCount}
                lastVersion={lastVersion}
                selectedVersion={null}
              />
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
