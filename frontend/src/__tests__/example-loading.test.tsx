import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import HomePage from "@/app/page";
import { useAutomatonStore } from "@/store/automaton-store";
import { mockSuccessfulApi } from "@/test/fixtures";

describe("example loading", () => {
  it("loads a backend example into the document store and summary", async () => {
    vi.stubGlobal("fetch", mockSuccessfulApi());
    const user = userEvent.setup();
    render(<HomePage />);

    await user.click(screen.getByRole("button", { name: "Examples" }));
    const example = await screen.findByRole("button", { name: /Ends with 01/ });
    await user.click(example);

    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("Ends with 01");
    expect(screen.getByRole("application", { name: "NFA state and transition canvas" })).toBeInTheDocument();
    expect(useAutomatonStore.getState().selectedExampleId).toBe("ends-with-01");
    expect(useAutomatonStore.getState().document?.alphabet).toEqual(["0", "1"]);
    expect(useAutomatonStore.getState().document?.acceptingStates).toEqual(["q2"]);
  });

  it("shows backend and example failure states without replacing the document", async () => {
    useAutomatonStore.getState().replaceDocument({
      schemaVersion: 1,
      alphabet: ["x"],
      states: ["saved"],
      initialState: "saved",
      acceptingStates: [],
      transitions: [],
    });
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("network down"))));
    const user = userEvent.setup();
    render(<HomePage />);

    await waitFor(() => expect(screen.getByText("Offline")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Examples" }));
    expect(await screen.findByText("Examples are unavailable")).toBeInTheDocument();
    expect(useAutomatonStore.getState().document?.states).toEqual(["saved"]);
  });
});

