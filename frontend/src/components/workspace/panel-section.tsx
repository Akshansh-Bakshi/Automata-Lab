import type { ReactNode } from "react";

interface PanelSectionProps {
  title: string;
  eyebrow: string;
  children: ReactNode;
}

export function PanelSection({ title, eyebrow, children }: PanelSectionProps) {
  return (
    <section className="panel-section">
      <header>
        <span>{eyebrow}</span>
        <h3>{title}</h3>
      </header>
      <div className="panel-section__content">{children}</div>
    </section>
  );
}

