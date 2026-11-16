import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HomePage from "@/app/page";
import { useAutomatonStore } from "@/store/automaton-store";
import { mockSuccessfulApi, sampleNfa } from "@/test/fixtures";

describe("authoritative editor validation", () => {
  it("distinguishes a backend-validated NFA", async () => {
    useAutomatonStore.getState().replaceDocument(sampleNfa);
    vi.stubGlobal("fetch", mockSuccessfulApi());
    render(<HomePage />);

    expect(await screen.findByText("Valid NFA", {}, { timeout: 2_000 })).toBeInTheDocument();
  });

  it("distinguishes backend unavailability without discarding the document", async () => {
    useAutomatonStore.getState().replaceDocument(sampleNfa);
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("offline"))));
    render(<HomePage />);

    expect(
      await screen.findByText("Validation unavailable", {}, { timeout: 2_000 }),
    ).toBeInTheDocument();
    expect(useAutomatonStore.getState().document?.states).toEqual(sampleNfa.states);
  });
});
