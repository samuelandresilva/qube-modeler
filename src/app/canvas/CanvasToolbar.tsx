type CanvasToolbarProps = {
    onFitView: () => void;
    onAddTable: () => void;
};

export function CanvasToolbar({ onFitView, onAddTable }: CanvasToolbarProps) {
    return (
        <div className="canvas-toolbar">
            <div className="canvas-toolbar__title">
                <strong>Qube Modeler</strong>
                <span>Canvas</span>
            </div>

            <button type="button" onClick={onFitView}>
                Fit view
            </button>
            <button type="button" onClick={onAddTable}>
                Add Table
            </button>
        </div>
    );
}