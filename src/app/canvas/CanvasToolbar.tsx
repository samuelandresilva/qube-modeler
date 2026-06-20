type CanvasToolbarProps = {
    onFitView: () => void;
};

export function CanvasToolbar({ onFitView }: CanvasToolbarProps) {
    return (
        <div className="canvas-toolbar">
            <div className="canvas-toolbar__title">
                <strong>Qube Modeler</strong>
                <span>Canvas</span>
            </div>

            <button type="button" onClick={onFitView}>
                Fit view
            </button>
        </div>
    );
}