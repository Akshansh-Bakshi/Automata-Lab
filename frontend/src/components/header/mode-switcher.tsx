"use client";

import { FlaskConical, Hammer, Route } from "lucide-react";
import { useWorkspaceStore, type WorkspaceMode } from "@/store/workspace-store";

const modes: Array<{
  id: WorkspaceMode;
  label: string;
  icon: typeof Hammer;
}> = [
  { id: "build", label: "Build", icon: Hammer },
  { id: "convert", label: "Convert", icon: Route },
  { id: "test", label: "Test", icon: FlaskConical },
];

export function ModeSwitcher() {
  const activeMode = useWorkspaceStore((state) => state.activeMode);
  const setActiveMode = useWorkspaceStore((state) => state.setActiveMode);

  return (
    <nav className="mode-switcher" aria-label="Workspace modes" data-responsive-navigation>
      {modes.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          className="mode-switcher__button"
          data-active={activeMode === id}
          aria-current={activeMode === id ? "page" : undefined}
          onClick={() => setActiveMode(id)}
        >
          <Icon size={15} strokeWidth={2} aria-hidden="true" />
          {label}
        </button>
      ))}
    </nav>
  );
}

