import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { DatabaseProject, DatabaseFunction, DatabaseFunctionArgument } from "@/core/model";
import { CanvasModal } from "@/app/canvas/components/CanvasModal";

type Props = {
  project: DatabaseProject;
  editingFunction?: DatabaseFunction;
  initialSchemaId?: string;
  onClose: () => void;
  onSubmit: (input: Omit<DatabaseFunction, "id">) => void;
  onDelete?: () => void;
};

export function FunctionDialog({
  project,
  editingFunction,
  initialSchemaId,
  onClose,
  onSubmit,
  onDelete,
}: Props) {
  const [schemaId, setSchemaId] = useState(
    editingFunction?.schemaId ?? initialSchemaId ?? (project.schemas[0]?.id || "")
  );
  const [name, setName] = useState(editingFunction?.name ?? "");
  const [language, setLanguage] = useState<"plpgsql" | "sql">(
    editingFunction?.language ?? "plpgsql"
  );
  const [returnType, setReturnType] = useState(editingFunction?.returnType ?? "trigger");
  const [body, setBody] = useState(
    editingFunction?.body ?? "BEGIN\n    RETURN NEW;\nEND;"
  );
  const [args, setArgs] = useState<DatabaseFunctionArgument[]>(
    editingFunction?.arguments ?? []
  );

  const handleAddArg = () => {
    setArgs((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: "",
        dataType: "",
        mode: undefined,
      },
    ]);
  };

  const handleRemoveArg = (id: string) => {
    setArgs((prev) => prev.filter((a) => a.id !== id));
  };

  const handleUpdateArg = (id: string, field: keyof DatabaseFunctionArgument, value: string) => {
    setArgs((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          if (field === "mode") {
            return { ...a, mode: value === "" ? undefined : (value as DatabaseFunctionArgument["mode"]) };
          }
          return { ...a, [field]: value };
        }
        return a;
      })
    );
  };

  const normalizedName = name.trim();
  const normalizedReturnType = returnType.trim();
  const normalizedBody = body.trim();

  // Basic validation checks
  const isNameEmpty = normalizedName === "";
  const isReturnTypeEmpty = normalizedReturnType === "";
  const isBodyEmpty = normalizedBody === "";
  const isSchemaEmpty = schemaId === "";

  // Arguments validation
  const hasInvalidArgs = args.some((arg) => arg.dataType.trim() === "");

  // Signature duplication check
  const normalizedArgs = args.map((arg) => ({
    id: arg.id,
    name: arg.name.trim(),
    dataType: arg.dataType.trim(),
    mode: arg.mode,
  }));

  const duplicateSignature =
    !isNameEmpty &&
    (project.functions ?? []).some((fn) => {
      if (editingFunction && fn.id === editingFunction.id) return false;
      const fnName = fn.name.trim().toLowerCase();
      const currentName = normalizedName.toLowerCase();
      const fnArgTypes = fn.arguments.map((a) => a.dataType.trim().toLowerCase()).join(",");
      const currentArgTypes = normalizedArgs.map((a) => a.dataType.toLowerCase()).join(",");
      return fn.schemaId === schemaId && fnName === currentName && fnArgTypes === currentArgTypes;
    });

  const canSubmit =
    !isSchemaEmpty &&
    !isNameEmpty &&
    !isReturnTypeEmpty &&
    !isBodyEmpty &&
    !hasInvalidArgs &&
    !duplicateSignature;

  const selectedSchema = project.schemas.find((s) => s.id === schemaId);

  return (
    <CanvasModal
      title={
        editingFunction
          ? `Edit function · ${editingFunction.name}`
          : `Add function · ${selectedSchema?.name || ""}`
      }
      onClose={onClose}
    >
      <div className="canvas-modal-form" style={{ maxHeight: "80vh", overflowY: "auto" }}>
        <label>
          <span>Schema</span>
          <select value={schemaId} onChange={(e) => setSchemaId(e.target.value)}>
            {project.schemas.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Function name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="fn_my_function"
          />
        </label>

        <label>
          <span>Language</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as "plpgsql" | "sql")}
          >
            <option value="plpgsql">plpgsql</option>
            <option value="sql">sql</option>
          </select>
        </label>

        <label>
          <span>Return type</span>
          <input
            value={returnType}
            onChange={(e) => setReturnType(e.target.value)}
            placeholder="trigger, integer, numeric, void..."
          />
        </label>

        <div style={{ margin: "16px 0 8px 0", borderBottom: "1px solid #334155", paddingBottom: "4px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 600, fontSize: "14px", color: "#94a3b8" }}>Arguments</span>
            <button
              type="button"
              onClick={handleAddArg}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "12px",
                padding: "2px 8px",
                background: "#0f172a",
                border: "1px solid #334155",
                borderRadius: "4px",
                color: "#cbd5e1",
                cursor: "pointer",
              }}
            >
              <Plus size={12} /> Add argument
            </button>
          </div>
        </div>

        {args.length === 0 ? (
          <div style={{ fontSize: "12px", color: "#64748b", fontStyle: "italic", marginBottom: "12px" }}>
            No arguments defined
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
            {args.map((arg, index) => (
              <div key={arg.id} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <select
                  value={arg.mode || ""}
                  onChange={(e) => handleUpdateArg(arg.id, "mode", e.target.value)}
                  style={{ width: "80px", flexShrink: 0 }}
                >
                  <option value="">mode</option>
                  <option value="IN">IN</option>
                  <option value="OUT">OUT</option>
                  <option value="INOUT">INOUT</option>
                </select>

                <input
                  value={arg.name}
                  onChange={(e) => handleUpdateArg(arg.id, "name", e.target.value)}
                  placeholder={`name (arg ${index + 1})`}
                  style={{ flex: 1 }}
                />

                <input
                  value={arg.dataType}
                  onChange={(e) => handleUpdateArg(arg.id, "dataType", e.target.value)}
                  placeholder="data type"
                  style={{ flex: 1 }}
                />

                <button
                  type="button"
                  onClick={() => handleRemoveArg(arg.id)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#f87171",
                    cursor: "pointer",
                    padding: "4px",
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        <label>
          <span>Body</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            style={{ fontFamily: "monospace", fontSize: "13px" }}
            placeholder="BEGIN&#10;    RETURN NEW;&#10;END;"
          />
        </label>

        {duplicateSignature && (
          <p className="canvas-modal-error">
            A function with this signature already exists in the selected schema.
          </p>
        )}

        {hasInvalidArgs && (
          <p className="canvas-modal-error">
            All arguments must have a defined data type.
          </p>
        )}

        <div className="canvas-modal-actions">
          {editingFunction && onDelete && (
            <button
              type="button"
              className="canvas-modal-actions__danger"
              style={{ marginRight: "auto", background: "#7f1d1d", color: "#fca5a5" }}
              onClick={onDelete}
            >
              Delete
            </button>
          )}
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() =>
              onSubmit({
                schemaId,
                name: normalizedName,
                language,
                returnType: normalizedReturnType,
                arguments: normalizedArgs,
                body: normalizedBody,
              })
            }
          >
            Save function
          </button>
        </div>
      </div>
    </CanvasModal>
  );
}
