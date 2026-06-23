import { useState } from "react";
import type { QbmFlywayVersion } from "@/core/qbm/qbm-file";

type FlywayMigrationsTableProps = {
  versions: QbmFlywayVersion[];
  selectedVersion: QbmFlywayVersion | null;
  onSelectVersion: (version: QbmFlywayVersion | null) => void;
};

export function FlywayMigrationsTable({
  versions,
  selectedVersion,
  onSelectVersion,
}: FlywayMigrationsTableProps) {
  const [search, setSearch] = useState("");

  const filteredVersions = versions.filter((v) => {
    const query = search.toLowerCase();
    return (
      v.version.toLowerCase().includes(query) ||
      v.description.toLowerCase().includes(query) ||
      v.fileName.toLowerCase().includes(query)
    );
  });

  return (
    <div className="flyway-table-container">
      <div className="flyway-table-header-controls">
        <input
          type="text"
          className="flyway-search-input"
          placeholder="Filter migrations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flyway-table-wrapper">
        <table className="flyway-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Version</th>
              <th>Description</th>
              <th>File Name</th>
              <th>Created At</th>
            </tr>
          </thead>
          <tbody>
            {filteredVersions.length === 0 ? (
              <tr>
                <td colSpan={5} className="flyway-table-empty">
                  {search ? "No migrations match the filter." : "No migrations available."}
                </td>
              </tr>
            ) : (
              filteredVersions.map((v) => {
                const isSelected = selectedVersion?.id === v.id;
                const formattedDate = new Date(v.createdAt).toLocaleString();
                return (
                  <tr
                    key={v.id}
                    className={`flyway-table-row ${isSelected ? "flyway-table-row--selected" : ""}`}
                    onClick={() => onSelectVersion(isSelected ? null : v)}
                  >
                    <td>
                      <span className="flyway-badge flyway-badge--versioned">Versioned</span>
                    </td>
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
