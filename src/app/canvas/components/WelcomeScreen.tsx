import qubeIcon from "@/assets/qube-modeler-icon.png";
import type { RecentProject } from "@/core/qbm/ipc-types";
import { FolderOpen, Plus } from "lucide-react";
import type { KeyboardEvent } from "react";
import "../styles/WelcomeScreen.css";

type WelcomeScreenProps = {
  recentProjects: RecentProject[];
  onNewProject: () => void;
  onOpenProject: () => void;
  onOpenRecentProject: (filePath: string) => void;
  onRemoveRecentProject: (filePath: string) => void;
  appVersion: string;
  onOpenAbout: () => void;
};

export function WelcomeScreen({
  recentProjects,
  onNewProject,
  onOpenProject,
  onOpenRecentProject,
  onRemoveRecentProject,
  appVersion,
  onOpenAbout,
}: WelcomeScreenProps) {
  const handleRecentProjectKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    filePath: string,
  ) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onOpenRecentProject(filePath);
  };

  const formatLastOpened = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="canvas-welcome">
      <div className="canvas-welcome__container">
        <div className="canvas-welcome__hero">
          <div className="canvas-welcome__logo">
            <img src={qubeIcon} className="canvas-welcome__logo-icon" alt="Qube Modeler" />
            <h1 className="canvas-welcome__title">Qube Modeler</h1>
          </div>
          <p className="canvas-welcome__subtitle">
            Design PostgreSQL models visually, manage migrations, and keep your database history in one project file.
          </p>

          <div className="canvas-welcome__actions">
            <button
              className="canvas-welcome__btn canvas-welcome__btn--primary"
              onClick={onNewProject}
              id="welcome-new-project-btn"
            >
              <span><Plus /></span> New Project
            </button>
            <button
              className="canvas-welcome__btn canvas-welcome__btn--secondary"
              onClick={onOpenProject}
              id="welcome-open-project-btn"
            >
              <span><FolderOpen color="#FFBF00" /></span> Open Project
            </button>
          </div>

          <div className="welcome-screen__meta">
            <span className="welcome-screen__version">v{appVersion}</span>
            <span className="welcome-screen__meta-separator">·</span>
            <button
              className="welcome-screen__about-button"
              onClick={onOpenAbout}
              type="button"
            >
              About
            </button>
          </div>
        </div>

        <div className="canvas-welcome__recent">
          <h2 className="canvas-welcome__recent-title">Recent Projects</h2>
          {recentProjects.length === 0 ? (
            <div className="canvas-welcome__empty-state">
              <p>No recent projects found</p>
              <span style={{ fontSize: "24px", marginTop: "8px" }}><FolderOpen color="#FFBF00" /></span>
            </div>
          ) : (
            <div className="canvas-welcome__recent-list">
              {recentProjects.map((project) => (
                <div
                  key={project.filePath}
                  className="canvas-welcome__recent-item"
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpenRecentProject(project.filePath)}
                  onKeyDown={(event) =>
                    handleRecentProjectKeyDown(event, project.filePath)
                  }
                >
                  <div className="canvas-welcome__recent-info">
                    <span className="canvas-welcome__recent-name">
                      {project.name}
                    </span>
                    <span className="canvas-welcome__recent-path" title={project.filePath}>
                      {project.filePath}
                    </span>
                    <span className="canvas-welcome__recent-meta">
                      Opened: {formatLastOpened(project.lastOpenedAt)}
                    </span>
                  </div>
                  <button
                    className="canvas-welcome__recent-remove"
                    type="button"
                    aria-label={`Remove ${project.name} from recent projects`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveRecentProject(project.filePath);
                    }}
                    title="Remove from recent list"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
