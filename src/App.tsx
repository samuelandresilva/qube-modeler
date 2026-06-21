import { useState } from "react";

import "./App.css";
import { Canvas } from "./app/canvas/Canvas";
import { createEmptyProject } from "./core/model";

export default function App() {
  const [project, setProject] = useState(createEmptyProject);
  return (
    <div className={`root root--canvas`}>
      <Canvas project={project} setProject={setProject} />
    </div>
  );
}