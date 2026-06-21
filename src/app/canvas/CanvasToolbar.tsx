import {
    FileCode2,
    FileJson,
    Grid2X2Plus,
    Scan,
} from "lucide-react";

type CanvasToolbarProps = {
    onFitView: () => void;
    onAddTable: () => void;
    onExportJson: () => void;
    onGenerateSql: () => void;
};

export function CanvasToolbar({
    onFitView,
    onAddTable,
    onExportJson,
    onGenerateSql,
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

                <button
                    className="canvas-toolbar__icon-button"
                    type="button"
                    title="Export JSON"
                    aria-label="Export JSON"
                    onClick={onExportJson}
                >
                    <FileJson size={18} strokeWidth={2.4} />
                </button>

                <button
                    className="canvas-toolbar__icon-button"
                    type="button"
                    title="Generate SQL"
                    aria-label="Generate SQL"
                    onClick={onGenerateSql}
                >
                    <FileCode2 size={18} strokeWidth={2.4} />
                </button>
            </div>
        </div>
    );
}