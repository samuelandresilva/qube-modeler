import { useEffect } from "react";
import appIconUrl from "@/assets/qube-modeler-icon.png";

type AppTitleBarProps = {
  title: string;
};

export function AppTitleBar({ title }: AppTitleBarProps) {
  const isMac =
    navigator.platform.toLowerCase().includes("mac") ||
    navigator.userAgent.toLowerCase().includes("mac");

  useEffect(() => {
    document.title = title;
  }, [title]);

  return (
    <>
      <div
        className={`app-title-bar app-drag ${isMac ? "app-title-bar--mac" : ""}`}
      >
        <img
          className="app-title-bar__icon"
          src={appIconUrl}
          alt=""
          aria-hidden="true"
          draggable={false}
        />
        <span className="app-title-bar__title">{title}</span>
      </div>

      <div className="app-title-bar-divider" />
    </>
  );
}
