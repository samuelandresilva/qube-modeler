import { diffProjects } from "@/core/diff/project-diff";
import type { ProjectDiff } from "@/core/diff/project-diff-types";
import { generatePostgresMigrationSql } from "@/core/migration/postgres-migration-generator";
import type { QbmFile, QbmFlywayManualScript, QbmFlywayVersion } from "@/core/qbm/qbm-file";
import {
  buildFlywayFileName,
  buildFlywayVersionSql,
  getFlywayVersions,
  getLastFlywayVersion,
} from "@/core/qbm/qbm-flyway";
import { generatePostgresSql } from "@/core/sql/postgres-generator";
import { ArrowLeft, Folder, FolderOpen, RefreshCw, Database, Wrench } from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import "../styles/FlywayMigrationsScreen.css";
import { CanvasModal } from "./CanvasModal";
import { FlywayMigrationsDetails } from "./FlywayMigrationsDetails";
import { FlywayMigrationsTable } from "./FlywayMigrationsTable";
import { MessageDialog } from "./MessageDialog";
import { ConfirmDialog } from "./ConfirmDialog";
import { DatabaseConnectionModal } from "./DatabaseConnectionModal";
import { SqlEditor } from "@/app/shared/components/SqlEditor";
import type { FlywayHistoryRecord } from "@/core/qbm/ipc-types";

type FlywayMigrationsScreenProps = {
  qbmFile: QbmFile;
  onBack: () => void;
  onConfirmMigration: (newVersion: QbmFlywayVersion) => void;
  onUpdateMigrationsDirectory?: (directoryPath: string | undefined) => void;
  onUpdateDatabaseConnection?: (connection: import("@/core/qbm/qbm-file").QbmDatabaseConnectionConfig | undefined) => void;
  onDeleteLastMigration?: () => void;
  onSaveProject?: () => Promise<boolean>;
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

function SqlEditorPreview({ sql }: { sql: string }) {
  return <SqlEditor value={sql} readOnly height="550px" />;
}

export function FlywayMigrationsScreen({
  qbmFile,
  onBack,
  onConfirmMigration,
  onUpdateMigrationsDirectory,
  onUpdateDatabaseConnection,
  onDeleteLastMigration,
  onSaveProject,
}: FlywayMigrationsScreenProps) {
  const { t } = useTranslation(["flyway", "common"]);
  const [selectedVersion, setSelectedVersion] = useState<QbmFlywayVersion | null>(null);
  const [previewData, setPreviewData] = useState<PreviewState | null>(null);
  const [destructiveChangesAccepted, setDestructiveChangesAccepted] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [migrationFlowMode, setMigrationFlowMode] = useState<"initial" | "next" | null>(null);
  const [versionInput, setVersionInput] = useState("");
  const [descriptionInput, setDescriptionInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [exportErrorMessage, setExportErrorMessage] = useState<string | null>(null);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);

  // Directory & synchronization state
  const migrationsDirectory = qbmFile.flyway.migrationsDirectory;
  const [diskFileNames, setDiskFileNames] = useState<Set<string>>(new Set());
  const [isLoadingDiskFiles, setIsLoadingDiskFiles] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  // Database Connection & Flyway schema history state
  const dbConfig = qbmFile.flyway.connection;
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [dbHistory, setDbHistory] = useState<FlywayHistoryRecord[]>([]);
  const [isLoadingDbHistory, setIsLoadingDbHistory] = useState(false);
  const [dbErrorMessage, setDbErrorMessage] = useState<string | null>(null);
  const [isRepairingDb, setIsRepairingDb] = useState(false);

  const versions = getFlywayVersions(qbmFile);
  const lastVersion = getLastFlywayVersion(qbmFile);
  const totalCount = versions.length;

  const refreshDiskFiles = useCallback(async () => {
    if (!migrationsDirectory) {
      setDiskFileNames(new Set());
      return;
    }
    const api = window.qubeModeler;
    if (!api) return;

    setIsLoadingDiskFiles(true);
    try {
      const res = await api.getDirectoryFiles(migrationsDirectory);
      if ("files" in res && Array.isArray(res.files)) {
        setDiskFileNames(new Set(res.files));
      }
    } catch (err) {
      console.error("Failed to read directory files:", err);
    } finally {
      setIsLoadingDiskFiles(false);
    }
  }, [migrationsDirectory]);

  useEffect(() => {
    let cancelled = false;
    if (!migrationsDirectory) {
      return;
    }
    const api = window.qubeModeler;
    if (!api) return;

    api.getDirectoryFiles(migrationsDirectory).then((res) => {
      if (cancelled) return;
      if ("files" in res && Array.isArray(res.files)) {
        setDiskFileNames(new Set(res.files));
      }
    }).catch((err) => {
      if (!cancelled) console.error("Failed to read directory files:", err);
    });

    return () => {
      cancelled = true;
    };
  }, [migrationsDirectory]);

  const pendingVersions = useMemo(() => {
    if (!migrationsDirectory) return [];
    return versions.filter((v) => !diskFileNames.has(v.fileName));
  }, [versions, diskFileNames, migrationsDirectory]);

  const dbHistoryMap = useMemo(() => {
    const map = new Map<string, FlywayHistoryRecord>();
    for (const record of dbHistory) {
      if (record.version) {
        map.set(record.version, record);
      }
    }
    return map;
  }, [dbHistory]);

  const refreshDbHistory = useCallback(async () => {
    if (!dbConfig) {
      setDbHistory([]);
      return;
    }
    const api = window.qubeModeler;
    if (!api) return;

    setIsLoadingDbHistory(true);
    setDbErrorMessage(null);
    try {
      const res = await api.fetchFlywayHistory(dbConfig);
      if (res.success) {
        setDbHistory(res.history);
      } else {
        setDbErrorMessage(res.error);
      }
    } catch (err) {
      setDbErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoadingDbHistory(false);
    }
  }, [dbConfig]);

  useEffect(() => {
    let cancelled = false;
    if (!dbConfig) {
      return;
    }
    const api = window.qubeModeler;
    if (!api) return;

    api.fetchFlywayHistory(dbConfig).then((res) => {
      if (cancelled) return;
      if (res.success) {
        setDbHistory(res.history);
      } else {
        setDbErrorMessage(res.error);
      }
    }).catch((err) => {
      if (!cancelled) setDbErrorMessage(err instanceof Error ? err.message : String(err));
    });

    return () => {
      cancelled = true;
    };
  }, [dbConfig]);

  const handleRepairDb = async () => {
    if (!dbConfig) return;
    const api = window.qubeModeler;
    if (!api) return;

    setIsRepairingDb(true);
    try {
      const res = await api.repairFlywayFailedMigrations(dbConfig);
      if (res.success) {
        setExportSuccessMessage(res.message);
        await refreshDbHistory();
      } else {
        setDbErrorMessage(res.error);
      }
    } catch (err) {
      setDbErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsRepairingDb(false);
    }
  };

  const handleSelectDirectory = async () => {
    const api = window.qubeModeler;
    if (!api) {
      setExportErrorMessage("Electron API is not available.");
      return;
    }
    try {
      const result = await api.selectDirectory();
      if (!result.canceled && "directoryPath" in result) {
        onUpdateMigrationsDirectory?.(result.directoryPath);
      } else if (!result.canceled && "error" in result) {
        setExportErrorMessage(result.error);
      }
    } catch (err) {
      setExportErrorMessage(`Error selecting directory: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleExportBatch = async (versionsToExport: QbmFlywayVersion[]) => {
    if (!migrationsDirectory) {
      setExportErrorMessage("No migrations directory configured.");
      return;
    }
    if (versionsToExport.length === 0) return;

    if (onSaveProject) {
      const saved = await onSaveProject();
      if (!saved) {
        setExportErrorMessage("The project file (.qbm) could not be saved. Migration files were not exported.");
        return;
      }
    }

    const api = window.qubeModeler;
    if (!api) {
      setExportErrorMessage("Electron API is not available.");
      return;
    }

    try {
      const files = versionsToExport.map((v) => ({
        fileName: v.fileName,
        sql: buildFlywayVersionSql(v),
      }));

      const res = await api.exportMigrationsBatch({
        directoryPath: migrationsDirectory,
        files,
      });

      if ("error" in res && res.error) {
        setExportErrorMessage(res.error);
      } else if ("count" in res) {
        setExportSuccessMessage(
          res.count === 1
            ? `1 migration saved to folder successfully.`
            : `${res.count} migrations saved to folder successfully.`
        );
        await refreshDiskFiles();
      }
    } catch (err) {
      setExportErrorMessage(`Error saving migrations to folder: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleSaveSelectedToDirectory = async () => {
    if (!selectedVersion) return;
    await handleExportBatch([selectedVersion]);
  };

  const handleExportAllToDirectory = async () => {
    await handleExportBatch(versions);
  };

  const handleExportPendingToDirectory = async () => {
    await handleExportBatch(pendingVersions);
  };

  const handleDeleteLastMigrationClick = () => {
    if (lastVersion && dbHistoryMap.get(lastVersion.version)?.success) {
      setExportErrorMessage(
        `Cannot delete migration "${lastVersion.fileName}" because it has already been applied to the database.`
      );
      return;
    }
    setIsConfirmDeleteOpen(true);
  };

  const handleConfirmDeleteLastMigration = () => {
    setIsConfirmDeleteOpen(false);
    onDeleteLastMigration?.();
    setSelectedVersion(null);
  };

  const hasContent = qbmFile.project.schemas.some(
    (s) => s.tables.length > 0 || s.sequences.length > 0
  );

  const [tempManualScripts, setTempManualScripts] = useState<QbmFlywayManualScript[]>([]);

  // State to manage the modal form for adding/editing a temporary manual script in the confirmation form
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [editingScript, setEditingScript] = useState<QbmFlywayManualScript | null>(null);
  const [formScriptName, setFormScriptName] = useState("");
  const [formScriptExecution, setFormScriptExecution] = useState<"before" | "after">("after");
  const [formScriptOrder, setFormScriptOrder] = useState<number | "">("");
  const [formScriptSql, setFormScriptSql] = useState("");
  const [scriptFormError, setScriptFormError] = useState<string | null>(null);

  const handleOpenAddScriptForm = () => {
    setEditingScript(null);
    setFormScriptName("");
    setFormScriptExecution("after");
    
    // Auto-suggest next order number
    const groupScripts = tempManualScripts.filter((s) => s.execution === "after");
    const nextOrder = groupScripts.length > 0 ? Math.max(...groupScripts.map((s) => s.order)) + 1 : 1;
    
    setFormScriptOrder(nextOrder);
    setFormScriptSql("");
    setScriptFormError(null);
    setIsScriptModalOpen(true);
  };

  const handleOpenEditScriptForm = (script: QbmFlywayManualScript) => {
    setEditingScript(script);
    setFormScriptName(script.name);
    setFormScriptExecution(script.execution);
    setFormScriptOrder(script.order);
    setFormScriptSql(script.sql);
    setScriptFormError(null);
    setIsScriptModalOpen(true);
  };

  const handleScriptExecutionChange = (execution: "before" | "after") => {
    setFormScriptExecution(execution);
    if (!editingScript) {
      const groupScripts = tempManualScripts.filter((s) => s.execution === execution);
      const nextOrder = groupScripts.length > 0 ? Math.max(...groupScripts.map((s) => s.order)) + 1 : 1;
      setFormScriptOrder(nextOrder);
    }
  };

  const handleAddTempManualScript = (script: Omit<QbmFlywayManualScript, "id">) => {
    const newScript: QbmFlywayManualScript = {
      ...script,
      id: cryptoUuid(),
    };
    setTempManualScripts((prev) => [...prev, newScript]);
  };

  const handleEditTempManualScript = (script: QbmFlywayManualScript) => {
    setTempManualScripts((prev) =>
      prev.map((s) => (s.id === script.id ? script : s))
    );
  };

  const handleDeleteTempManualScript = (scriptId: string) => {
    setTempManualScripts((prev) => prev.filter((s) => s.id !== scriptId));
  };

  const handleSubmitScriptForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formScriptName.trim()) {
      setScriptFormError("Name is required.");
      return;
    }
    if (!formScriptExecution) {
      setScriptFormError("Execution is required.");
      return;
    }
    if (formScriptOrder === "" || isNaN(Number(formScriptOrder))) {
      setScriptFormError("Order must be a valid number.");
      return;
    }
    if (!formScriptSql.trim()) {
      setScriptFormError("SQL is required.");
      return;
    }

    if (editingScript) {
      handleEditTempManualScript({
        id: editingScript.id,
        name: formScriptName.trim(),
        execution: formScriptExecution,
        order: Number(formScriptOrder),
        sql: formScriptSql,
      });
    } else {
      handleAddTempManualScript({
        name: formScriptName.trim(),
        execution: formScriptExecution,
        order: Number(formScriptOrder),
        sql: formScriptSql,
      });
    }
    setIsScriptModalOpen(false);
  };

  const handleGenerateMigration = () => {
    if (!lastVersion) return;
    setDestructiveChangesAccepted(false);

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

  const handleOpenInitialConfirmForm = () => {
    setMigrationFlowMode("initial");
    setVersionInput("001");
    setDescriptionInput("initial_schema");
    setFormError(null);
    setTempManualScripts([]);
    setIsFormOpen(true);
  };

  const handleOpenConfirmForm = () => {
    if (!previewData || previewData.sql === "" || previewData.diff.operations.length === 0 || previewData.diff.unsupportedOperations.length > 0) {
      return;
    }
    setMigrationFlowMode("next");
    const nextVer = lastVersion ? suggestNextVersion(lastVersion.version) : "001";
    setVersionInput(nextVer);
    setDescriptionInput("migration");
    setFormError(null);
    setTempManualScripts([]);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setMigrationFlowMode(null);
    setFormError(null);
    setDestructiveChangesAccepted(false);
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

    let generatedSql: string;
    if (migrationFlowMode === "initial") {
      generatedSql = generatePostgresSql(qbmFile.project);
    } else {
      if (!previewData || !previewData.sql) {
        setFormError("No generated SQL to confirm.");
        return;
      }
      generatedSql = previewData.sql;
    }

    if (!generatedSql) {
      setFormError("Generated SQL is empty.");
      return;
    }

    const newMigration: QbmFlywayVersion = {
      id: cryptoUuid(),
      version: ver,
      description: desc,
      fileName: computedFileName,
      createdAt: new Date().toISOString(),
      projectSnapshot: JSON.parse(JSON.stringify(qbmFile.project)),
      generatedSql,
      manualScripts: tempManualScripts,
    };

    onConfirmMigration(newMigration);

    // Resetar estados
    setPreviewData(null);
    setMigrationFlowMode(null);
    setIsFormOpen(false);
    setSelectedVersion(null);
    setDestructiveChangesAccepted(false);
  };

  const handleExportSql = async () => {
    if (!selectedVersion) return;
    if (!selectedVersion.generatedSql) {
      setExportErrorMessage("This migration does not contain any generated SQL.");
      return;
    }

    try {
      const api = window.qubeModeler;
      if (!api) {
        setExportErrorMessage("Electron API is not available.");
        return;
      }

      const result = await api.exportMigrationSql({
        fileName: selectedVersion.fileName,
        sql: buildFlywayVersionSql(selectedVersion),
      });

      if (result && !result.canceled && "error" in result && result.error) {
        setExportErrorMessage(result.error);
      }
    } catch (error) {
      setExportErrorMessage(`Error exporting migration: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const hasDestructive = previewData?.diff.operations.some((op) => op.risk === "destructive") ?? false;
  const isConfirmEnabled =
    !!previewData &&
    previewData.sql !== "" &&
    previewData.diff.operations.length > 0 &&
    previewData.diff.unsupportedOperations.length === 0 &&
    (!hasDestructive || destructiveChangesAccepted) &&
    !previewData.error;

  return (
    <div className="flyway-screen">
      <header className="flyway-header">
        <div className="flyway-header__left">
          <button
            className="flyway-back-button"
            onClick={onBack}
            title={t("flyway:header.backToModel")}
            type="button"
          >
            <ArrowLeft size={18} strokeWidth={2.4} />
            <span>{t("flyway:header.backToModel")}</span>
          </button>
          <div className="flyway-header__title-container">
            <h1 className="flyway-header__title">{t("flyway:header.title")}</h1>
            <p className="flyway-header__subtitle">
              {t("flyway:header.subtitle")}
            </p>
          </div>
        </div>
      </header>

      <main className="flyway-main-content">
        <div className="flyway-directory-bar">
          <div className="flyway-directory-bar__info">
            <Folder className="flyway-directory-bar__icon" size={20} />
            <div className="flyway-directory-bar__text">
              <span className="flyway-directory-bar__label">{t("flyway:directory.targetLabel")}</span>
              {migrationsDirectory ? (
                <span className="flyway-directory-bar__path" title={migrationsDirectory}>
                  {migrationsDirectory}
                </span>
              ) : (
                <span className="flyway-directory-bar__path flyway-directory-bar__path--empty">
                  {t("flyway:directory.noDirectoryDescription")}
                </span>
              )}
            </div>
          </div>
          <div className="flyway-directory-bar__actions">
            {migrationsDirectory && (
              <>
                <button
                  type="button"
                  className="flyway-button flyway-button--secondary"
                  onClick={() => void refreshDiskFiles()}
                  disabled={isLoadingDiskFiles}
                  title={t("flyway:directory.refresh")}
                >
                  <RefreshCw size={14} className={isLoadingDiskFiles ? "animate-spin" : ""} style={{ marginRight: 6 }} />
                  {t("flyway:directory.refresh")}
                </button>
                {pendingVersions.length > 0 && (
                  <button
                    type="button"
                    className="flyway-button flyway-button--primary"
                    onClick={() => void handleExportPendingToDirectory()}
                    title={t("flyway:directory.savePending", { count: pendingVersions.length })}
                  >
                    {t("flyway:directory.savePending", { count: pendingVersions.length })}
                  </button>
                )}
                <button
                  type="button"
                  className="flyway-button flyway-button--secondary"
                  onClick={() => void handleExportAllToDirectory()}
                  title={t("flyway:directory.saveAll")}
                  disabled={versions.length === 0}
                >
                  {t("flyway:directory.saveAll")}
                </button>
              </>
            )}
            <button
              type="button"
              className="flyway-button flyway-button--secondary"
              onClick={() => void handleSelectDirectory()}
            >
              <FolderOpen size={14} style={{ marginRight: 6 }} />
              {migrationsDirectory ? t("flyway:directory.change") : t("flyway:directory.select")}
            </button>
          </div>
        </div>

        {/* Database Connection Bar */}
        <div className="flyway-directory-bar" style={{ borderColor: dbConfig ? "rgba(16, 185, 129, 0.4)" : "var(--color-border)" }}>
          <div className="flyway-directory-bar__info">
            <Database className="flyway-directory-bar__icon" size={20} style={{ color: dbConfig ? "#10b981" : "var(--color-text-muted)" }} />
            <div className="flyway-directory-bar__text">
              <span className="flyway-directory-bar__label">{t("flyway:database.liveTitle")}</span>
              {dbConfig ? (
                <span className="flyway-directory-bar__path" title={`${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`}>
                  {dbConfig.user}@{dbConfig.host}:{dbConfig.port}/{dbConfig.database} (schema: {dbConfig.schema || "public"})
                  {dbHistory.length > 0 && ` • ${dbHistory.length} migration(s) recorded in DB`}
                </span>
              ) : (
                <span className="flyway-directory-bar__path flyway-directory-bar__path--empty">
                  {t("flyway:database.optionalNotice")}
                </span>
              )}
            </div>
          </div>
          <div className="flyway-directory-bar__actions">
            {dbConfig && (
              <>
                <button
                  type="button"
                  className="flyway-button flyway-button--secondary"
                  onClick={() => void refreshDbHistory()}
                  disabled={isLoadingDbHistory}
                  title={t("flyway:database.refreshDb")}
                >
                  <RefreshCw size={14} className={isLoadingDbHistory ? "animate-spin" : ""} style={{ marginRight: 6 }} />
                  {t("flyway:database.refreshDb")}
                </button>
                <button
                  type="button"
                  className="flyway-button flyway-button--secondary"
                  onClick={() => void handleRepairDb()}
                  disabled={isRepairingDb}
                  title={t("flyway:database.repairFailed")}
                >
                  <Wrench size={14} style={{ marginRight: 6 }} />
                  {t("flyway:database.repairFailed")}
                </button>
              </>
            )}
            <button
              type="button"
              className="flyway-button flyway-button--secondary"
              onClick={() => setIsDbModalOpen(true)}
            >
              <Database size={14} style={{ marginRight: 6 }} />
              {dbConfig ? t("flyway:database.settings") : t("flyway:database.connect")}
            </button>
          </div>
        </div>

        {dbErrorMessage && (
          <div style={{ margin: "-8px 0 16px 0", padding: "8px 14px", backgroundColor: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "var(--radius-sm)", color: "#ef4444", fontSize: 12 }}>
            <strong>{t("flyway:database.errorTitle")}</strong> {dbErrorMessage}
          </div>
        )}

        <div className="flyway-layout-container">
          <div className="flyway-layout-grid">
            <div className="flyway-column-left">
              <div className="flyway-migrations-screen__table-panel">
                <FlywayMigrationsTable
                  versions={versions}
                  selectedVersion={selectedVersion}
                  diskFiles={migrationsDirectory ? diskFileNames : undefined}
                  dbHistoryMap={dbConfig ? dbHistoryMap : undefined}
                  hasDbConnection={!!dbConfig}
                  onSelectVersion={setSelectedVersion}
                />
              </div>
              <div className="flyway-migrations-screen__details-panel">
                {selectedVersion ? (
                  <FlywayMigrationsDetails
                    totalCount={totalCount}
                    lastVersion={lastVersion}
                    selectedVersion={selectedVersion}
                    onViewSql={() => setIsSqlModalOpen(true)}
                    onExportSql={handleExportSql}
                    onSaveToDirectory={migrationsDirectory ? handleSaveSelectedToDirectory : undefined}
                    onDeleteLastVersion={handleDeleteLastMigrationClick}
                    isLastVersion={lastVersion?.id === selectedVersion.id}
                    hasMigrationsDirectory={!!migrationsDirectory}
                    isSavedInDirectory={diskFileNames.has(selectedVersion.fileName)}
                    dbRecord={selectedVersion ? dbHistoryMap.get(selectedVersion.version) : undefined}
                  />
                ) : (
                  <div className="flyway-selected-details-panel flyway-selected-details-panel--empty">
                    <h3 className="flyway-details-title" style={{ color: "var(--color-text-muted)", marginTop: 0 }}>{t("flyway:details.noSelectionTitle")}</h3>
                    <p className="flyway-details-text">{t("flyway:details.noSelectionMessage")}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="flyway-column-right">
              {isFormOpen ? (
                <form onSubmit={handleConfirmSubmit} className="flyway-details-panel">
                  <div className="flyway-details-header">
                    <span className="flyway-details-badge">{t("flyway:confirm.badge")}</span>
                    <h3 className="flyway-details-title">{t("flyway:confirm.title")}</h3>
                  </div>

                  <div className="flyway-form-body">
                    <div className="flyway-form-field">
                      <label className="flyway-details-label" htmlFor="migration-version">{t("flyway:confirm.version")}</label>
                      <input
                        id="migration-version"
                        type="text"
                        className="flyway-search-input"
                        placeholder="e.g. 001"
                        value={versionInput}
                        onChange={(e) => {
                          setVersionInput(e.target.value);
                          setFormError(null);
                        }}
                      />
                    </div>

                    <div className="flyway-form-field">
                      <label className="flyway-details-label" htmlFor="migration-desc">{t("flyway:confirm.description")}</label>
                      <input
                        id="migration-desc"
                        type="text"
                        className="flyway-search-input"
                        placeholder="e.g. initial schema"
                        value={descriptionInput}
                        onChange={(e) => {
                          setDescriptionInput(e.target.value);
                          setFormError(null);
                        }}
                      />
                    </div>

                    <div className="flyway-preview-filename-box">
                      <span className="flyway-details-label">{t("flyway:confirm.targetFileName")}</span>
                      <span className="flyway-preview-filename-value">
                        {buildFlywayFileName(versionInput, descriptionInput)}
                      </span>
                    </div>

                    {/* Manual Scripts Editable Section inside Form */}
                    <div className="flyway-manual-scripts-section" style={{ borderTop: "1px solid var(--color-border)", paddingTop: "16px", marginTop: "8px" }}>
                      <div className="flyway-manual-scripts-header">
                        <span className="flyway-details-label">{t("flyway:details.manualScripts")}</span>
                        <button
                          className="flyway-button flyway-button--primary flyway-button--small"
                          type="button"
                          onClick={handleOpenAddScriptForm}
                        >
                          {t("flyway:details.addManualScript")}
                        </button>
                      </div>

                      {tempManualScripts.length === 0 ? (
                        <p className="flyway-manual-scripts-empty">
                          {t("flyway:details.noManualScripts")}
                        </p>
                      ) : (
                        <div className="flyway-manual-scripts-list">
                          {[...tempManualScripts]
                            .sort((a, b) => {
                              if (a.execution !== b.execution) {
                                  return a.execution === "before" ? -1 : 1;
                              }
                              return a.order - b.order;
                            })
                            .map((script) => (
                              <div key={script.id} className="flyway-manual-script-item">
                                <div className="flyway-manual-script-item__info">
                                  <span className="flyway-manual-script-item__name">{script.name}</span>
                                  <span className={`flyway-manual-script-item__badge flyway-manual-script-item__badge--${script.execution}`}>
                                    {script.execution}
                                  </span>
                                  <span className="flyway-manual-script-item__order">{t("flyway:details.order", { order: script.order })}</span>
                                </div>
                                <div className="flyway-manual-script-item__actions">
                                  <button
                                    className="flyway-button flyway-button--secondary flyway-button--small"
                                    type="button"
                                    onClick={() => handleOpenEditScriptForm(script)}
                                  >
                                    {t("common:actions.edit")}
                                  </button>
                                  <button
                                    className="flyway-button flyway-button--secondary flyway-button--small flyway-button--danger"
                                    type="button"
                                    onClick={() => handleDeleteTempManualScript(script.id)}
                                  >
                                    {t("common:actions.delete")}
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
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
                      onClick={handleCloseForm}
                    >
                      {t("common:actions.cancel")}
                    </button>
                    <button
                      className="flyway-button flyway-button--primary"
                      type="submit"
                    >
                      {t("flyway:confirm.button")}
                    </button>
                  </div>
                </form>
              ) : previewData ? (
                <div className="flyway-details-panel">
                  <div className="flyway-details-header">
                    <span className="flyway-details-badge">{t("flyway:preview.badge")}</span>
                    <h3 className="flyway-details-title">{t("flyway:preview.title")}</h3>
                  </div>

                  {(() => {
                    const safeOpsCount = previewData.diff.operations.filter(op => op.risk === "safe").length;
                    const warningOps = previewData.diff.operations.filter(op => op.risk === "warning");
                    const destructiveOps = previewData.diff.operations.filter(op => op.risk === "destructive");
                    const unsupportedOpsCount = previewData.diff.unsupportedOperations.length;

                    return (
                      <>
                        <div className="flyway-preview-meta-info">
                          <div className="flyway-preview-meta-row">
                            <span className="flyway-preview-meta-label">{t("flyway:preview.baseMigration")}</span>
                            <span className="flyway-preview-meta-value">{lastVersion?.fileName || "None"}</span>
                          </div>
                          <div className="flyway-preview-meta-row">
                            <span className="flyway-preview-meta-label">{t("flyway:preview.safeOps")}</span>
                            <span className="flyway-preview-meta-value" style={{ color: "var(--color-accent)", fontWeight: "bold" }}>{safeOpsCount}</span>
                          </div>
                          <div className="flyway-preview-meta-row">
                            <span className="flyway-preview-meta-label">{t("flyway:preview.warningOps")}</span>
                            <span className="flyway-preview-meta-value" style={{ color: "#eab308", fontWeight: "bold" }}>{warningOps.length}</span>
                          </div>
                          <div className="flyway-preview-meta-row">
                            <span className="flyway-preview-meta-label">{t("flyway:preview.destructiveOps")}</span>
                            <span className="flyway-preview-meta-value" style={{ color: "#ef4444", fontWeight: "bold" }}>{destructiveOps.length}</span>
                          </div>
                          <div className="flyway-preview-meta-row">
                            <span className="flyway-preview-meta-label">{t("flyway:preview.unsupportedOps")}</span>
                            <span className={`flyway-preview-meta-value ${unsupportedOpsCount > 0 ? "flyway-preview-meta-value--warning" : ""}`}>
                              {unsupportedOpsCount}
                            </span>
                          </div>
                        </div>

                        {previewData.noChanges && (
                          <div className="flyway-preview-message flyway-preview-message--info">
                            <strong>{t("flyway:preview.noPendingChanges")}</strong>
                            <p>{t("flyway:preview.noChangesDetected")}</p>
                          </div>
                        )}

                        {previewData.error && (
                          <div className="flyway-preview-message flyway-preview-message--error">
                            <strong>Generation Error</strong>
                            <p>{previewData.error}</p>
                          </div>
                        )}

                        {warningOps.length > 0 && (
                          <div className="flyway-preview-message" style={{ borderLeft: "4px solid #eab308", background: "rgba(234, 179, 8, 0.05)", padding: "12px", borderRadius: "8px", margin: "16px 0" }}>
                            <strong style={{ color: "#eab308", fontSize: "14px" }}>{t("flyway:preview.warningChangesDetected")}</strong>
                            <p style={{ margin: "4px 0 8px 0", fontSize: "13px", color: "var(--color-text-muted)" }}>{t("flyway:preview.warningDescription")}</p>
                            <ul className="flyway-warning-list">
                              {warningOps.map((op, idx) => {
                                const opCast = op as {
                                  kind: string;
                                  schemaName?: string;
                                  tableName?: string;
                                  columnName?: string;
                                  sequenceName?: string;
                                  oldName?: string;
                                  newName?: string;
                                };
                                const targetName = (() => {
                                  if (opCast.kind === "RENAME_COLUMN") {
                                    return `${opCast.schemaName}.${opCast.tableName}.${opCast.oldName} -> ${opCast.newName}`;
                                  }
                                  if (opCast.kind === "RENAME_TABLE") {
                                    return `${opCast.schemaName}.${opCast.oldName} -> ${opCast.newName}`;
                                  }
                                  if (opCast.kind === "RENAME_SEQUENCE") {
                                    return `${opCast.schemaName}.${opCast.oldName} -> ${opCast.newName}`;
                                  }
                                  if (opCast.kind === "RENAME_INDEX") {
                                    return `${opCast.schemaName}.${opCast.oldName} -> ${opCast.newName}`;
                                  }
                                  if (
                                    opCast.kind === "RENAME_UNIQUE_CONSTRAINT" ||
                                    opCast.kind === "RENAME_FOREIGN_KEY" ||
                                    opCast.kind === "RENAME_PRIMARY_KEY"
                                  ) {
                                    return `${opCast.schemaName}.${opCast.tableName}.${opCast.oldName} -> ${opCast.newName}`;
                                  }
                                  if (opCast.kind === "RENAME_SCHEMA") {
                                    return `${opCast.oldName} -> ${opCast.newName}`;
                                  }
                                  return opCast.tableName
                                    ? (opCast.columnName ? `${opCast.schemaName}.${opCast.tableName}.${opCast.columnName}` : `${opCast.schemaName}.${opCast.tableName}`)
                                    : opCast.oldName
                                      ? `${opCast.oldName} ➔ ${opCast.newName}`
                                      : opCast.schemaName || "";
                                })();
                                return (
                                  <li key={idx} style={{ fontSize: "13px", color: "var(--color-text)", listStyleType: "disc" }}>
                                    {opCast.kind.replace(/_/g, " ")}: {targetName}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}

                        {destructiveOps.length > 0 && (
                          <div className="flyway-preview-message" style={{ borderLeft: "4px solid #ef4444", background: "rgba(239, 68, 68, 0.05)", padding: "12px", borderRadius: "8px", margin: "16px 0" }}>
                            <strong style={{ color: "#ef4444", fontSize: "14px" }}>{t("flyway:preview.criticalDestructiveDetected")}</strong>
                            <p style={{ margin: "4px 0 8px 0", fontSize: "13px", color: "var(--color-text-muted)" }}>{t("flyway:preview.destructiveDescription")}</p>
                            <ul className="flyway-unsupported-list" style={{ paddingLeft: "20px", marginBottom: "12px" }}>
                              {destructiveOps.map((op, idx) => {
                                const opCast = op as {
                                  kind: string;
                                  schemaName?: string;
                                  tableName?: string;
                                  columnName?: string;
                                  sequenceName?: string;
                                  oldName?: string;
                                  newName?: string;
                                };
                                const targetName = opCast.tableName ? `${opCast.schemaName}.${opCast.tableName}.${opCast.columnName || ""}` : opCast.sequenceName ? `${opCast.schemaName}.${opCast.sequenceName}` : opCast.schemaName;
                                return (
                                  <li key={idx} style={{ fontSize: "13px", color: "var(--color-text)", listStyleType: "disc" }}>
                                    Drop {opCast.kind.replace("DROP_", "").replace(/_/g, " ").toLowerCase()}: {targetName}
                                  </li>
                                );
                              })}
                            </ul>
                            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: "bold", cursor: "pointer", color: "var(--color-text-strong)", userSelect: "none" }}>
                              <input
                                type="checkbox"
                                checked={destructiveChangesAccepted}
                                onChange={(e) => setDestructiveChangesAccepted(e.target.checked)}
                                style={{ width: "16px", height: "16px", cursor: "pointer" }}
                              />
                              {t("flyway:preview.dataLossConfirmation")}
                            </label>
                          </div>
                        )}

                        {unsupportedOpsCount > 0 && (
                          <div className="flyway-preview-message flyway-preview-message--warning">
                            <strong>{t("flyway:preview.unsupportedChangesDetected")}</strong>
                            <p>{t("flyway:preview.unsupportedDescription")}</p>
                            <ul className="flyway-unsupported-list">
                              {previewData.diff.unsupportedOperations.map((op, idx) => (
                                <li key={idx}>
                                  [{op.objectType}] {op.objectName} - {op.reason}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    );
                  })()}

                  {previewData.sql && (
                    <div className="flyway-sql-preview-container">
                      <span className="flyway-details-label">{t("flyway:preview.generatedSqlPreview")}</span>
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
                      {t("flyway:preview.closePreview")}
                    </button>
                    <button
                      className="flyway-button flyway-button--primary"
                      type="button"
                      onClick={handleOpenConfirmForm}
                      disabled={!isConfirmEnabled}
                    >
                      {t("flyway:confirm.button")}
                    </button>
                  </div>
                </div>
              ) : (
                <FlywayMigrationsDetails
                  totalCount={totalCount}
                  lastVersion={lastVersion}
                  selectedVersion={null}
                  onGenerateMigration={handleGenerateMigration}
                  onGenerateInitialMigration={handleOpenInitialConfirmForm}
                  hasContent={hasContent}
                />
              )}
            </div>
          </div>
        </div>
      </main>

      {isSqlModalOpen && selectedVersion && (
        <CanvasModal
          title={`SQL Preview - ${selectedVersion.fileName}`}
          onClose={() => setIsSqlModalOpen(false)}
          elevated
          className="canvas-modal--large"
        >
          <SqlEditorPreview sql={buildFlywayVersionSql(selectedVersion)} />
        </CanvasModal>
      )}

      {exportErrorMessage && (
        <MessageDialog
          title={t("common:dialogs.errorTitle")}
          message={exportErrorMessage}
          onClose={() => setExportErrorMessage(null)}
        />
      )}

      {isScriptModalOpen && (
        <CanvasModal
          title={editingScript ? t("flyway:scripts.editTitle") : t("flyway:scripts.addTitle")}
          onClose={() => setIsScriptModalOpen(false)}
          elevated
        >
          <form onSubmit={handleSubmitScriptForm} className="canvas-modal-form">
            <label>
              <span>{t("flyway:scripts.name")}</span>
              <input
                type="text"
                placeholder="e.g. create extra index"
                value={formScriptName}
                onChange={(e) => setFormScriptName(e.target.value)}
              />
            </label>

            <div className="canvas-modal-form__row">
              <label>
                <span>{t("flyway:scripts.execution")}</span>
                <select
                  value={formScriptExecution}
                  onChange={(e) => handleScriptExecutionChange(e.target.value as "before" | "after")}
                >
                  <option value="before">{t("flyway:scripts.executionBefore")}</option>
                  <option value="after">{t("flyway:scripts.executionAfter")}</option>
                </select>
              </label>

              <label>
                <span>{t("flyway:scripts.order")}</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formScriptOrder}
                  onChange={(e) =>
                    setFormScriptOrder(e.target.value === "" ? "" : Number(e.target.value))
                  }
                />
              </label>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                width: "100%",
                minWidth: 0,
                maxWidth: "100%",
              }}
            >
              <span
                style={{
                  color: "var(--color-text-muted)",
                  fontSize: "12px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                }}
              >
                {t("flyway:scripts.sqlScript")}
              </span>
              <SqlEditor
                value={formScriptSql}
                onChange={(val) => setFormScriptSql(val)}
                placeholder="CREATE INDEX ..."
                height="180px"
              />
            </div>

            {scriptFormError && <p className="canvas-modal-error">{scriptFormError}</p>}

            <div className="canvas-modal-actions">
              <button type="button" onClick={() => setIsScriptModalOpen(false)}>
                {t("common:actions.cancel")}
              </button>
              <button type="submit">
                {editingScript ? t("common:actions.save") : t("flyway:details.addManualScript")}
              </button>
            </div>
          </form>
        </CanvasModal>
      )}

      {exportErrorMessage && (
        <MessageDialog
          title={t("common:dialogs.errorTitle")}
          message={exportErrorMessage}
          onClose={() => setExportErrorMessage(null)}
        />
      )}

      {exportSuccessMessage && (
        <MessageDialog
          title={t("common:status.success")}
          message={exportSuccessMessage}
          onClose={() => setExportSuccessMessage(null)}
        />
      )}

      {isConfirmDeleteOpen && lastVersion && (
        <ConfirmDialog
          message={t("flyway:details.deleteConfirmMessage", { fileName: lastVersion.fileName })}
          confirmLabel={t("flyway:details.deleteConfirmTitle")}
          onConfirm={handleConfirmDeleteLastMigration}
          onCancel={() => setIsConfirmDeleteOpen(false)}
        />
      )}

      <DatabaseConnectionModal
        isOpen={isDbModalOpen}
        currentConfig={dbConfig}
        onClose={() => setIsDbModalOpen(false)}
        onSave={(newConfig) => {
          onUpdateDatabaseConnection?.(newConfig);
          if (newConfig) {
            void refreshDbHistory();
          } else {
            setDbHistory([]);
          }
        }}
      />
    </div>
  );
}
