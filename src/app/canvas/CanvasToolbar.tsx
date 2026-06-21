import { Grid2X2Plus, Scan } from "lucide-react";

type CanvasToolbarProps = {
    onFitView: () => void;
    onAddTable: () => void;
};

export function CanvasToolbar({
    onFitView,
    onAddTable,
}: CanvasToolbarProps) {
    return (
        <div className="canvas-toolbar">
            <div className="canvas-toolbar__actions">
                <button
                    className="canvas-toolbar__icon-button"
                    type="button"
                    title="Fit view"
                    aria-label="Fit view"
                    onClick={onFitView}
                >
                    <Scan size={17} strokeWidth={2.4} />
                </button>

                <button
                    className="canvas-toolbar__icon-button"
                    type="button"
                    title="Add table"
                    aria-label="Add table"
                    onClick={onAddTable}
                >
                    <Grid2X2Plus size={18} strokeWidth={2.4} />
                </button>
            </div>
        </div>
    );
}