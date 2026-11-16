import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HomePage from "@/app/page";
import { useAutomatonStore } from "@/store/automaton-store";
import { mockSuccessfulApi } from "@/test/fixtures";

describe("keyboard-accessible NFA editing", () => {
  beforeEach(() => vi.stubGlobal("fetch", mockSuccessfulApi()));

  it("creates a document, state, symbol, and transition without graph dragging", async () => {
    const user = userEvent.setup();
    render(<HomePage />);

    await user.click(screen.getAllByRole("button", { name: "Create blank NFA" })[0]);
    await user.type(screen.getByLabelText("New state ID"), "q1{Enter}");
    await user.type(screen.getByLabelText("New alphabet symbol"), "a{Enter}");

    await user.selectOptions(screen.getByLabelText("Source"), "q0");
    await user.selectOptions(screen.getByLabelText("Symbol"), "a");
    await user.click(screen.getByRole("checkbox", { name: "q1" }));
    await user.click(screen.getByRole("button", { name: "Save transition" }));

    expect(useAutomatonStore.getState().document?.transitions).toContainEqual({
      from: "q0",
      symbol: "a",
      to: ["q1"],
    });
  });
});
