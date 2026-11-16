import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { Example } from "@/lib/api/types";
import { documentToEdges, documentToNodes } from "@/lib/editor/graph-model";
import { useAutomatonStore } from "@/store/automaton-store";

describe("curated example editor integration", () => {
  const examplesDirectory = resolve(process.cwd(), "../backend/automatalab/examples");
  const files = readdirSync(examplesDirectory).filter((file) => file.endsWith(".json"));

  it("loads and derives complete graph metadata for all five backend examples", () => {
    expect(files).toHaveLength(5);
    for (const file of files) {
      const example = JSON.parse(readFileSync(resolve(examplesDirectory, file), "utf8")) as Example;
      useAutomatonStore.getState().loadExample(example);
      const document = useAutomatonStore.getState().document!;

      expect(useAutomatonStore.getState().selectedExampleId).toBe(example.id);
      expect(Object.keys(document.layout ?? {})).toEqual(document.states);
      expect(documentToNodes(document)).toHaveLength(document.states.length);
      expect(documentToEdges(document).every((edge) => document.states.includes(edge.source) && document.states.includes(edge.target))).toBe(true);
    }
  });
});
