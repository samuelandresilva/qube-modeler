import { useEffect } from "react";

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
        <span className="app-title-bar__title">{title}</span>
      </div>

      <div className="app-title-bar-divider" />
    </>
  );
}
