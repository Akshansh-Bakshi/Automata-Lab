import { CircleAlert, RotateCw } from "lucide-react";

interface ErrorNoticeProps {
  title: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorNotice({ title, message, onRetry }: ErrorNoticeProps) {
  return (
    <div className="error-notice" role="alert">
      <CircleAlert size={18} aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <p>{message}</p>
      </div>
      {onRetry ? (
        <button className="text-button" type="button" onClick={onRetry}>
          <RotateCw size={14} aria-hidden="true" />
          Retry
        </button>
      ) : null}
    </div>
  );
}

