"use client";

import { CircleAlert, CircleCheck, LoaderCircle, RotateCw } from "lucide-react";
import type { BackendHealthState } from "@/hooks/use-backend-health";

type BackendStatusProps = BackendHealthState & {
  onRetry: () => void;
};

export function BackendStatus({ status, message, onRetry }: BackendStatusProps) {
  const Icon =
    status === "connected" ? CircleCheck : status === "checking" ? LoaderCircle : CircleAlert;

  return (
    <div className="backend-status" data-status={status} role="status" aria-live="polite">
      <Icon className={status === "checking" ? "spin" : undefined} size={15} aria-hidden="true" />
      <span>{status === "connected" ? "Connected" : status === "checking" ? "Checking" : "Offline"}</span>
      <span className="sr-only">{message}</span>
      {status === "unavailable" ? (
        <button type="button" onClick={onRetry} aria-label="Retry backend connection">
          <RotateCw size={13} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

