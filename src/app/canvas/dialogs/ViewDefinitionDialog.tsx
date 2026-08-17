import { useState } from "react";
import { CanvasModal } from "@/app/canvas/components/CanvasModal";
import { SqlEditor } from "@/app/shared/components/SqlEditor";

type Props = {
  initialValue: string;
  viewName: string;
  onClose: () => void;
  onSubmit: (value: string) => void;
};

export function ViewDefinitionDialog({ initialValue, viewName, onClose, onSubmit }: Props) {
  const [value, setValue] = useState(initialValue);

  return (
    <CanvasModal title={`Edit View SQL · ${viewName}`} onClose={onClose} className="canvas-modal--large">
      <div className="canvas-modal-form">
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
          <span style={{ fontWeight: "bold", fontSize: "14px", color: "#cbd5e1" }}>Definition (SQL SELECT)</span>
          <SqlEditor
            value={value}
            onChange={(val) => setValue(val)}
            height="400px"
          />
        </div>

        <div className="canvas-modal-actions" style={{ marginTop: "16px" }}>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" onClick={() => onSubmit(value)}>
            Save SQL
          </button>
        </div>
      </div>
    </CanvasModal>
  );
}
