export function AppTitleBar() {
    const isMac =
        navigator.platform.toLowerCase().includes("mac") ||
        navigator.userAgent.toLowerCase().includes("mac");

    return (
        <>
            <div className={`app-title-bar app-drag ${isMac ? "app-title-bar--mac" : ""}`}>
                <span className="app-title-bar__title">Qube Modeler</span>
            </div>

            <div className="app-title-bar-divider" />
        </>
    );
}