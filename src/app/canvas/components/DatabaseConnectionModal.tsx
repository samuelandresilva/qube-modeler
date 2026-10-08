import { useState } from "react";
import type { FormEvent } from "react";
import { CanvasModal } from "./CanvasModal";
import type { QbmDatabaseConnectionConfig } from "@/core/qbm/qbm-file";
import { Database, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

type DatabaseConnectionModalProps = {
  currentConfig?: QbmDatabaseConnectionConfig;
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: QbmDatabaseConnectionConfig | undefined) => void;
};

export function DatabaseConnectionModal({
  currentConfig,
  isOpen,
  onClose,
  onSave,
}: DatabaseConnectionModalProps) {
  const [host, setHost] = useState(currentConfig?.host ?? "localhost");
  const [port, setPort] = useState(currentConfig?.port ?? 5432);
  const [database, setDatabase] = useState(currentConfig?.database ?? "");
  const [user, setUser] = useState(currentConfig?.user ?? "postgres");
  const [password, setPassword] = useState(currentConfig?.password ?? "");
  const [schema, setSchema] = useState(currentConfig?.schema ?? "public");
  const [ssl, setSsl] = useState(currentConfig?.ssl ?? false);

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTestResult(null);
    setIsTesting(true);

    const api = window.qubeModeler;
    if (!api) {
      setTestResult({ success: false, message: "Electron API is not available." });
      setIsTesting(false);
      return;
    }

    try {
      const config: QbmDatabaseConnectionConfig = {
        host: host.trim(),
        port: Number(port) || 5432,
        database: database.trim(),
        user: user.trim(),
        password: password ? password : undefined,
        schema: schema.trim() || "public",
        ssl,
      };

      const res = await api.testDbConnection(config);
      if (res.success) {
        setTestResult({
          success: true,
          message: `Connected successfully! (${res.serverVersion.split("on")[0].trim()})`,
        });
      } else {
        setTestResult({
          success: false,
          message: res.error || "Connection failed.",
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const config: QbmDatabaseConnectionConfig = {
      host: host.trim(),
      port: Number(port) || 5432,
      database: database.trim(),
      user: user.trim(),
      password: password ? password : undefined,
      schema: schema.trim() || "public",
      ssl,
    };
    onSave(config);
    onClose();
  };

  const handleDisconnect = () => {
    onSave(undefined);
    onClose();
  };

  return (
    <CanvasModal title="Database Connection (Flyway Inspector)" onClose={onClose} elevated>
      <form onSubmit={handleSubmit} className="canvas-modal-form">
        <p style={{ margin: "0 0 16px 0", fontSize: 13, color: "var(--color-text-muted)" }}>
          Connect to your PostgreSQL database to inspect applied migrations in{" "}
          <code>flyway_schema_history</code>, check live status, and perform repairs.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: "12px" }}>
          <label>
            <span>Host</span>
            <input
              type="text"
              required
              placeholder="localhost"
              value={host}
              onChange={(e) => setHost(e.target.value)}
            />
          </label>
          <label>
            <span>Port</span>
            <input
              type="number"
              required
              placeholder="5432"
              value={port}
              onChange={(e) => setPort(Number(e.target.value))}
            />
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <label>
            <span>Database</span>
            <input
              type="text"
              required
              placeholder="my_database"
              value={database}
              onChange={(e) => setDatabase(e.target.value)}
            />
          </label>
          <label>
            <span>Flyway Schema</span>
            <input
              type="text"
              placeholder="public"
              value={schema}
              onChange={(e) => setSchema(e.target.value)}
            />
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <label>
            <span>User</span>
            <input
              type="text"
              required
              placeholder="postgres"
              value={user}
              onChange={(e) => setUser(e.target.value)}
            />
          </label>
          <label>
            <span>Password</span>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", marginTop: "4px" }}>
          <input
            type="checkbox"
            checked={ssl}
            onChange={(e) => setSsl(e.target.checked)}
            style={{ width: "auto" }}
          />
          <span style={{ fontSize: 13 }}>Enable SSL</span>
        </label>

        {testResult && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "8px",
              padding: "10px 12px",
              borderRadius: "var(--radius-sm)",
              fontSize: 12,
              marginTop: "8px",
              backgroundColor: testResult.success ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
              color: testResult.success ? "#10b981" : "#ef4444",
              border: `1px solid ${testResult.success ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
            }}
          >
            {testResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span style={{ wordBreak: "break-word" }}>{testResult.message}</span>
          </div>
        )}

        <div className="canvas-modal-actions" style={{ justifyContent: "space-between", marginTop: "16px" }}>
          <div>
            {currentConfig && (
              <button
                type="button"
                onClick={handleDisconnect}
                style={{
                  background: "transparent",
                  color: "var(--color-danger)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                }}
              >
                Disconnect
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || !host || !database || !user}
            >
              {isTesting ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
              <span style={{ marginLeft: 6 }}>Test Connection</span>
            </button>
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary" disabled={!host || !database || !user}>
              Save Connection
            </button>
          </div>
        </div>
      </form>
    </CanvasModal>
  );
}
