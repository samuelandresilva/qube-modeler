import { useState } from "react";

import App from "./App";
import { Canvas } from "./app/canvas/Canvas";
import "./Root.css";
import { createEmptyProject } from "./core/model";

type ViewMode = "editor" | "canvas";

export function Root() {
    const [viewMode, setViewMode] = useState<ViewMode>("canvas");
    const [project, setProject] = useState(createEmptyProject);

    return (
        <>
            <div className="root-view-switcher">
                <button
                    data-active={viewMode === "editor"}
                    onClick={() => setViewMode("editor")}
                >
                    Editor
                </button>

                <button
                    data-active={viewMode === "canvas"}
                    onClick={() => setViewMode("canvas")}
                >
                    Canvas
                </button>
            </div>

            {viewMode === "editor" ? (
                <App project={project} setProject={setProject} />
            ) : (
                <Canvas project={project} setProject={setProject} />
            )}
        </>
    );
}