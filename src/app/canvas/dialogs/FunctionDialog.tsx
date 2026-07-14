import { useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { DatabaseProject, DatabaseFunction, DatabaseFunctionArgument } from "@/core/model";
import { CanvasModal } from "@/app/canvas/components/CanvasModal";
import { POSTGRES_COLUMN_TYPES } from "@/core/sql/postgres-column-types";
import { SqlEditor } from "@/app/shared/components/SqlEditor";

type Props = {
  project: DatabaseProject;
  editingFunction?: DatabaseFunction;
  initialSchemaId?: string;
  onClose: () => void;
  onSubmit: (input: Omit<DatabaseFunction, "id">) => void;
  onDelete?: () => void;
};

interface ComboboxProps {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
}

function Combobox({ value, onChange, options, placeholder }: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [prevValue, setPrevValue] = useState(value);
  const [search, setSearch] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  if (value !== prevValue) {
    setPrevValue(value);
    setSearch(value);
  }

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      <input
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
      />
      {isOpen && filteredOptions.length > 0 && (
        <ul
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 100,
            background: "var(--color-bg)",
            border: "1px solid var(--color-border-strong)",
            borderRadius: "var(--radius-md)",
            maxHeight: "150px",
            overflowY: "auto",
            margin: "4px 0 0 0",
            padding: "4px 0",
            listStyle: "none",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
          }}
        >
          {filteredOptions.map((opt) => (
            <li
              key={opt}
              onClick={() => {
                onChange(opt);
                setSearch(opt);
                setIsOpen(false);
              }}
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                color: "var(--color-text)",
                fontSize: "13px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--color-border-strong)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

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
  const [returnType, setReturnType] = useState(editingFunction?.returnType ?? "");
  const [body, setBody] = useState(editingFunction?.body ?? "");
  const [args, setArgs] = useState<DatabaseFunctionArgument[]>(
    editingFunction?.arguments ?? []
  );

  const getBodyPlaceholder = () => {
    if (language === "sql") {
      return "-- Example:\nSELECT * FROM tables WHERE id = arg_name;";
    }
    if (language === "plpgsql") {
      if (returnType.trim().toLowerCase() === "trigger") {
        return "-- Example:\nBEGIN\n  NEW.updated_at = NOW();\n  RETURN NEW;\nEND;";
      } else {
        return "-- Example:\nBEGIN\n  -- Write your logic here\n  RETURN;\nEND;";
      }
    }
    return "";
  };

  const isTriggerReturn = returnType.trim().toLowerCase() === "trigger";

  const handleReturnTypeChange = (newType: string) => {
    setReturnType(newType);
    if (newType.trim().toLowerCase() === "trigger") {
      setArgs([]);
    }
  };

  const handleAddArg = () => {
    if (isTriggerReturn) return;
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

  const returnTypeOptions = ["trigger", "void", ...POSTGRES_COLUMN_TYPES];

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
          <Combobox
            value={returnType}
            onChange={handleReturnTypeChange}
            options={returnTypeOptions}
            placeholder="trigger, integer, numeric, void..."
          />
        </label>

        <div style={{ margin: "16px 0 8px 0", borderBottom: "1px solid #334155", paddingBottom: "4px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 600, fontSize: "14px", color: "#94a3b8" }}>Arguments</span>
            {!isTriggerReturn && (
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
            )}
          </div>
        </div>

        {isTriggerReturn ? (
          <div style={{ fontSize: "12px", color: "#38bdf8", fontStyle: "italic", marginBottom: "12px" }}>
            Trigger functions do not accept formal arguments in PostgreSQL.
          </div>
        ) : args.length === 0 ? (
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

                <select
                  value={arg.dataType}
                  onChange={(e) => handleUpdateArg(arg.id, "dataType", e.target.value)}
                  style={{ flex: 1 }}
                >
                  <option value="">Select data type</option>
                  {POSTGRES_COLUMN_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>

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

        <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%" }}>
          <span style={{ fontWeight: "bold", fontSize: "14px", color: "#cbd5e1" }}>Body</span>
          <SqlEditor
            value={body}
            onChange={(val) => setBody(val)}
            placeholder={getBodyPlaceholder()}
            height="180px"
          />
        </div>

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
