import { useState } from "react";

import { Canvas } from "@/app/canvas/Canvas";
import { createEmptyProject } from "@/core/model";
import { AppTitleBar } from "./app/canvas/components/AppTitleBar";

export default function App() {
  const [project, setProject] = useState(createEmptyProject);

  return (
    <div className="app-shell">
      <AppTitleBar />

      <div className="app-content">
        <Canvas project={project} setProject={setProject} />
      </div>
    </div>
  );
}