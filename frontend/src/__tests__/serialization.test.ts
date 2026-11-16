import { describe, expect, it } from "vitest";
import {
  ImportDocumentError,
  parseNfaJson,
  serializeNfa,
  withInitializedLayout,
} from "@/lib/editor/nfa-document";
import { sampleNfa } from "@/test/fixtures";

describe("NFA JSON import and export", () => {
  it("round-trips an API-compatible document with stable serialization", () => {
    const document = withInitializedLayout({
      ...sampleNfa,
      transitions: [...sampleNfa.transitions].reverse(),
    });
    const first = serializeNfa(document);
    const parsed = parseNfaJson(first);
    const second = serializeNfa(parsed);

    expect(second).toBe(first);
    expect(parsed.transitions[0]).toEqual({ from: "q0", symbol: "0", to: ["q0", "q1"] });
    expect(parsed.layout).toEqual(document.layout);
  });

  it("returns structured errors for malformed and incompatible imports", () => {
    expect(() => parseNfaJson("{")).toThrow(ImportDocumentError);
    try {
      parseNfaJson(JSON.stringify({ ...sampleNfa, customGraph: true }));
    } catch (caught) {
      expect(caught).toBeInstanceOf(ImportDocumentError);
      expect((caught as ImportDocumentError).issues).toContainEqual(
        expect.objectContaining({ path: "customGraph", code: "SCHEMA_VIOLATION" }),
      );
    }
  });
});
