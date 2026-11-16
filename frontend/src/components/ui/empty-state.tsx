import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  eyebrow?: string;
  title: string;
  description: string;
  compact?: boolean;
}

export function EmptyState({ icon: Icon, eyebrow, title, description, compact }: EmptyStateProps) {
  return (
    <div className={compact ? "empty-state empty-state--compact" : "empty-state"}>
      <div className="empty-state__icon" aria-hidden="true">
        <Icon size={compact ? 18 : 24} strokeWidth={1.8} />
      </div>
      <div>
        {eyebrow ? <p className="empty-state__eyebrow">{eyebrow}</p> : null}
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

