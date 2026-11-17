import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import HomePage from "@/app/page";
import { ConvertInspector } from "@/components/conversion/convert-inspector";
import { DocumentActions } from "@/components/header/document-actions";
import type { NfaValidationState } from "@/hooks/use-nfa-validation";
import { serializeNfa } from "@/lib/editor/nfa-document";
import { useAutomatonStore } from "@/store/automaton-store";
import { mockSuccessfulApi, sampleNfa } from "@/test/fixtures";

const valid: NfaValidationState = { status: "valid", issues: [], warnings: [] };

describe("conversion workflows", () => {
  it("loads an example, runs the backend conversion, and renders the dual workspace and table", async () => {
    vi.stubGlobal("fetch", mockSuccessfulApi());
    const user = userEvent.setup();
    render(<HomePage />);

    await user.click(screen.getByRole("button", { name: "Examples" }));
    await user.click(await screen.findByRole("button", { name: /Ends with 01/ }));
    await user.click(screen.getByRole("button", { name: "Convert" }));
    const generate = screen.getByRole("button", { name: "Generate DFA" });
    await waitFor(() => expect(generate).toBeEnabled(), { timeout: 2_000 });
    await user.click(generate);

    expect(await screen.findByText("Dead state included")).toBeInTheDocument();
    expect(screen.getByTestId("dual-graph-workspace")).toHaveClass("dual-graph-workspace");
    expect(
      screen.getByRole("application", { name: "Generated DFA state and transition canvas" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /DFA transition table/ }));
    expect(screen.getByText("Complete deterministic transition function returned by the backend.")).toBeInTheDocument();
  });

  it("shows a stale state after a semantic edit and allows regeneration", async () => {
    vi.stubGlobal("fetch", mockSuccessfulApi());
    useAutomatonStore.getState().replaceDocument(sampleNfa);
    const user = userEvent.setup();
    render(<HomePage />);
    await user.click(screen.getByRole("button", { name: "Convert" }));
    const generate = screen.getByRole("button", { name: "Generate DFA" });
    await waitFor(() => expect(generate).toBeEnabled(), { timeout: 2_000 });
    await user.click(generate);
    await screen.findByText("Fresh result");

    act(() => useAutomatonStore.getState().toggleAcceptingState("q0"));

    expect(screen.getByText("Previous DFA invalidated")).toBeInTheDocument();
    expect(screen.getByText(/Generate a fresh DFA for this revision/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate DFA" })).toBeDisabled();
    await waitFor(
      () => expect(screen.getByRole("button", { name: "Generate DFA" })).toBeEnabled(),
      { timeout: 2_000 },
    );
  });

  it("converts a successfully imported API document", async () => {
    vi.stubGlobal("fetch", mockSuccessfulApi());
    const user = userEvent.setup();
    render(<ImportConvertHarness />);

    await user.click(screen.getByRole("button", { name: /Import \/ export/ }));
    await user.upload(
      screen.getByLabelText("Choose NFA JSON file"),
      fileWithText("imported.json", serializeNfa({ ...sampleNfa, name: "Imported then converted" })),
    );
    await waitFor(() => expect(useAutomatonStore.getState().document?.name).toBe("Imported then converted"));
    await user.click(screen.getByRole("button", { name: "Generate DFA" }));

    await waitFor(() => expect(useAutomatonStore.getState().conversionStatus).toBe("ready"));
    expect(useAutomatonStore.getState().isConversionFresh()).toBe(true);
  });
});

function ImportConvertHarness() {
  const document = useAutomatonStore((state) => state.document);
  return (
    <>
      <DocumentActions document={document} />
      <ConvertInspector document={document} validation={valid} />
    </>
  );
}

function fileWithText(name: string, source: string) {
  const file = new File([source], name, { type: "application/json" });
  Object.defineProperty(file, "text", { value: async () => source });
  return file;
}
