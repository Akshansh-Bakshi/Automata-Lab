import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BackendStatus } from "@/components/header/backend-status";

describe("BackendStatus", () => {
  it("renders checking, connected, and unavailable states", () => {
    const { rerender } = render(
      <BackendStatus status="checking" data={null} message="Checking API" onRetry={vi.fn()} />,
    );
    expect(screen.getByText("Checking")).toBeInTheDocument();

    rerender(
      <BackendStatus
        status="connected"
        data={{ status: "ok", version: "1.0.0" }}
        message="API connected"
        onRetry={vi.fn()}
      />,
    );
    expect(screen.getByText("Connected")).toBeInTheDocument();

    rerender(
      <BackendStatus status="unavailable" data={null} message="Backend offline" onRetry={vi.fn()} />,
    );
    expect(screen.getByText("Offline")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry backend connection" })).toBeInTheDocument();
  });
});

