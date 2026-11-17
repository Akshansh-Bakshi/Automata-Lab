import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HomePage from "@/app/page";
import { mockSuccessfulApi } from "@/test/fixtures";

describe("HomePage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockSuccessfulApi());
  });

  it("renders the AutomataLab workspace and honest empty states", () => {
    render(<HomePage />);

    expect(screen.getByRole("link", { name: "AutomataLab workspace home" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "NFA workspace" })).toBeInTheDocument();
    expect(screen.getByText("Start with a curated NFA")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Workspace modes" })).toHaveAttribute(
      "data-responsive-navigation",
    );
  });

  it("switches Build, Convert, and Test modes", async () => {
    const user = userEvent.setup();
    render(<HomePage />);

    await user.click(screen.getByRole("button", { name: "Convert" }));
    expect(screen.getByRole("heading", { name: "Conversion workspace" })).toBeInTheDocument();
    expect(screen.getByLabelText("Convert workspace panel")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Test" }));
    expect(screen.getByRole("heading", { name: "Test workspace" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Test a string" })).toBeInTheDocument();
  });
});

