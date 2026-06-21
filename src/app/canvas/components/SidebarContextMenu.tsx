import * as ContextMenu from "@radix-ui/react-context-menu";
import type { ReactNode } from "react";

type Action = {
  label: string;
  icon: ReactNode;
  danger?: boolean;
  onSelect: () => void;
};

export function SidebarContextMenu({
  children,
  actions,
}: {
  children: ReactNode;
  actions: Action[];
}) {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className="canvas-context-menu">
          {actions.map((action) => (
            <ContextMenu.Item
              key={action.label}
              className={`canvas-context-menu__item${action.danger ? " canvas-context-menu__item--danger" : ""}`}
              onSelect={action.onSelect}
            >
              <span className="canvas-context-menu__item-icon">
                {action.icon}
              </span>
              {action.label}
            </ContextMenu.Item>
          ))}
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
