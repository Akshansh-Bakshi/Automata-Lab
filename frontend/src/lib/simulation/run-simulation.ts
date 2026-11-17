import { ApiClientError, simulateNfa } from "@/lib/api/client";
import { canonicalizeNfa, getEditorReadiness } from "@/lib/editor/nfa-document";
import { inspectSimulation } from "./simulation-model";
import { useAutomatonStore } from "@/store/automaton-store";
import { useSimulationStore } from "@/store/simulation-store";

let activeController: AbortController | null = null;

export function cancelActiveSimulation() {
  activeController?.abort();
  activeController = null;
}

export async function runSimulation(validationStatus: string): Promise<{ ok: boolean; message?: string }> {
  const automaton = useAutomatonStore.getState();
  const state = useSimulationStore.getState();
  if (state.status === "loading") return { ok: false, message: "Simulation is already running." };
  if (!automaton.document) return { ok: false, message: "Create or load an NFA first." };
  if (getEditorReadiness(automaton.document).status !== "ready" || validationStatus !== "valid") return { ok: false, message: "Wait for a valid NFA before testing." };
  const input = state.input;
  const symbols = [...input];
  if (symbols.length > 1000) return { ok: false, message: "Input may contain at most 1,000 symbols." };
  const bad = symbols.findIndex((symbol) => !automaton.document!.alphabet.includes(symbol));
  if (bad >= 0) return { ok: false, message: `Symbol '${symbols[bad]}' at position ${bad + 1} is not in the alphabet.` };
  cancelActiveSimulation();
  const controller = new AbortController();
  activeController = controller;
  const document = canonicalizeNfa(automaton.document);
  const revision = automaton.documentRevision;
  const requestId = state.begin(revision);
  try {
    const result = await simulateNfa(document, input, { signal: controller.signal });
    if (useAutomatonStore.getState().documentRevision !== revision) return { ok: false, message: "NFA changed during simulation." };
    if (useSimulationStore.getState().requestId !== requestId || useSimulationStore.getState().input !== input) return { ok: false, message: "The input changed during simulation." };
    const issues = inspectSimulation(result, document, input);
    if (issues.length) {
      const diagnostic = result?.simulation?.agree === false
        ? `Backend disagreement: NFA ${result.simulation.nfa?.accepted ? "accepted" : "rejected"}, DFA ${result.simulation.dfa?.accepted ? "accepted" : "rejected"}. ${issues[0]}`
        : issues[0];
      useSimulationStore.getState().fail(requestId, revision, input, "CONTRACT_VIOLATION", diagnostic);
      return { ok: false, message: diagnostic };
    }
    const stored = useSimulationStore.getState().succeed(requestId, revision, input, result);
    return stored ? { ok: true } : { ok: false, message: "The input changed during simulation." };
  } catch (caught) {
    const error = caught instanceof ApiClientError ? caught : new ApiClientError("Unexpected simulation error.", 0, "SIMULATION_ERROR");
    if (error.code === "REQUEST_CANCELLED") return { ok: false, message: "Simulation cancelled." };
    useSimulationStore.getState().fail(requestId, revision, input, error.code, error.message, error.issues[0]?.path);
    return { ok: false, message: error.message };
  } finally {
    if (activeController === controller) activeController = null;
  }
}
