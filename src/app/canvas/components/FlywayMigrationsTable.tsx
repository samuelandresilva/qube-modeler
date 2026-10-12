import { useState } from "react";
import type { KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import type { QbmFlywayVersion } from "@/core/qbm/qbm-file";

import type { FlywayHistoryRecord } from "@/core/qbm/ipc-types";

type FlywayMigrationsTableProps = {
  versions: QbmFlywayVersion[];
  selectedVersion: QbmFlywayVersion | null;
  diskFiles?: Set<string>;
  dbHistoryMap?: Map<string, FlywayHistoryRecord>;
  hasDbConnection?: boolean;
  onSelectVersion: (version: QbmFlywayVersion | null) => void;
};

export function FlywayMigrationsTable({
  versions,
  selectedVersion,
  diskFiles,
  dbHistoryMap,
  hasDbConnection = false,
  onSelectVersion,
}: FlywayMigrationsTableProps) {
  const { t, i18n } = useTranslation("flyway");
  const [search, setSearch] = useState("");

  const filteredVersions = versions.filter((v) => {
    const query = search.toLowerCase();
    return (
      v.version.toLowerCase().includes(query) ||
      v.description.toLowerCase().includes(query) ||
      v.fileName.toLowerCase().includes(query)
    );
  });

  const handleRowKeyDown = (
    event: KeyboardEvent<HTMLTableRowElement>,
    version: QbmFlywayVersion,
    isSelected: boolean,
  ) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onSelectVersion(isSelected ? null : version);
  };

  return (
    <div className="flyway-table-container">
      <div className="flyway-table-header-controls">
        <input
          type="text"
          className="flyway-search-input"
          placeholder={t("table.filterPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flyway-table-wrapper">
        <table className="flyway-table">
          <thead>
            <tr>
              <th>{t("table.columns.file")}</th>
              {hasDbConnection && <th>{t("table.columns.database")}</th>}
              <th>{t("table.columns.version")}</th>
              <th>{t("table.columns.description")}</th>
              <th>{t("table.columns.fileName")}</th>
              <th>{t("table.columns.createdAt")}</th>
            </tr>
          </thead>
          <tbody>
            {filteredVersions.length === 0 ? (
              <tr>
                <td colSpan={hasDbConnection ? 6 : 5} className="flyway-table-empty">
                  {search ? t("table.noMatch") : t("table.noMigrations")}
                </td>
              </tr>
            ) : (
              filteredVersions.map((v) => {
                const isSelected = selectedVersion?.id === v.id;
                const formattedDate = new Date(v.createdAt).toLocaleString(i18n.language);
                const dbRecord = dbHistoryMap?.get(v.version);

                return (
                  <tr
                    key={v.id}
                    className={`flyway-table-row ${isSelected ? "flyway-table-row--selected" : ""}`}
                    role="button"
                    tabIndex={0}
                    aria-selected={isSelected}
                    onClick={() => onSelectVersion(isSelected ? null : v)}
                    onKeyDown={(event) =>
                      handleRowKeyDown(event, v, isSelected)
                    }
                  >
                    <td>
                      {diskFiles ? (
                        diskFiles.has(v.fileName) ? (
                          <span className="flyway-badge flyway-badge--synced" title={t("table.status.savedTitle")}>
                            {t("table.status.saved")}
                          </span>
                        ) : (
                          <span className="flyway-badge flyway-badge--pending" title={t("table.status.pendingTitle")}>
                            {t("table.status.pending")}
                          </span>
                        )
                      ) : (
                        <span className="flyway-badge flyway-badge--versioned">{t("table.status.ready")}</span>
                      )}
                    </td>
                    {hasDbConnection && (
                      <td>
                        {dbRecord ? (
                          dbRecord.success ? (
                            <span className="flyway-badge flyway-badge--applied" title={`Applied on ${dbRecord.installedOn} by ${dbRecord.installedBy}`}>
                              {t("table.status.applied")}
                            </span>
                          ) : (
                            <span className="flyway-badge flyway-badge--failed" title={t("table.status.failedTitle")}>
                              {t("table.status.failed")}
                            </span>
                          )
                        ) : (
                          <span className="flyway-badge flyway-badge--not-applied" title={t("table.status.notAppliedTitle")}>
                            {t("table.status.notApplied")}
                          </span>
                        )}
                      </td>
                    )}
                    <td className="flyway-cell-version">{v.version}</td>
                    <td className="flyway-cell-description">{v.description}</td>
                    <td className="flyway-cell-filename">{v.fileName}</td>
                    <td className="flyway-cell-date">{formattedDate}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
