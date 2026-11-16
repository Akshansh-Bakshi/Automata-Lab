import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DocumentActions } from "@/components/header/document-actions";
import { serializeNfa } from "@/lib/editor/nfa-document";
import { useAutomatonStore } from "@/store/automaton-store";
import { jsonResponse, sampleNfa } from "@/test/fixtures";

function ActionsHarness() {
  const document = useAutomatonStore((state) => state.document);
  return <DocumentActions document={document} />;
}

describe("document import", () => {
  it("validates and replaces the document after a valid JSON import", async () => {
    useAutomatonStore.getState().createDocument();
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ valid: true, warnings: [] })));
    const user = userEvent.setup();
    render(<ActionsHarness />);
    await user.click(screen.getByRole("button", { name: /Import \/ export/ }));
    const imported = { ...sampleNfa, name: "Imported NFA" };
    const file = fileWithText("nfa.json", serializeNfa(imported));
    await user.upload(screen.getByLabelText("Choose NFA JSON file"), file);

    await waitFor(() => expect(useAutomatonStore.getState().document?.name).toBe("Imported NFA"));
    expect(screen.getByText("Imported Imported NFA.")).toBeInTheDocument();
  });

  it("preserves the current document when import fails", async () => {
    useAutomatonStore.getState().replaceDocument(sampleNfa);
    const before = structuredClone(useAutomatonStore.getState().document);
    const user = userEvent.setup();
    render(<ActionsHarness />);
    await user.click(screen.getByRole("button", { name: /Import \/ export/ }));
    await user.upload(screen.getByLabelText("Choose NFA JSON file"), fileWithText("bad.json", "{"));

    expect(await screen.findByText("Import was not applied")).toBeInTheDocument();
    expect(useAutomatonStore.getState().document).toEqual(before);
  });
});

function fileWithText(name: string, source: string) {
  const file = new File([source], name, { type: "application/json" });
  Object.defineProperty(file, "text", { value: async () => source });
  return file;
}
