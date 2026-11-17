import { ApiClientError, convertNfa } from "@/lib/api/client";
import { getEditorReadiness } from "@/lib/editor/nfa-document";
import { useAutomatonStore } from "@/store/automaton-store";

export type ConversionReadinessStatus =
  | "idle"
  | "incomplete"
  | "validating"
  | "valid"
  | "invalid"
  | "unavailable";

export type RunConversionResult =
  | { ok: true }
  | { ok: false; reason: "duplicate" | "blocked" | "stale" | "error"; message: string };

let activeController: AbortController | null = null;

export async function runConversion(
  validationStatus: ConversionReadinessStatus,
): Promise<RunConversionResult> {
  const state = useAutomatonStore.getState();
  if (state.conversionStatus === "loading") {
    return { ok: false, reason: "duplicate", message: "A conversion is already in progress." };
  }
  if (!state.document) {
    return { ok: false, reason: "blocked", message: "Create or load an NFA first." };
  }
  const readiness = getEditorReadiness(state.document);
  if (readiness.status === "incomplete") {
    return { ok: false, reason: "blocked", message: readiness.issues[0].message };
  }
  if (validationStatus !== "valid") {
    return {
      ok: false,
      reason: "blocked",
      message: validationMessage(validationStatus),
    };
  }

  activeController?.abort();
  const controller = new AbortController();
  activeController = controller;
  const document = structuredClone(state.document);
  const { requestId, revision } = useAutomatonStore.getState().beginConversion();

  try {
    const conversion = await convertNfa(document, { signal: controller.signal });
    const stored = useAutomatonStore.getState().setConversion(requestId, revision, conversion);
    return stored
      ? { ok: true }
      : {
          ok: false,
          reason: "stale",
          message: "The NFA changed before conversion completed. Run conversion again.",
        };
  } catch (caught) {
    const error =
      caught instanceof ApiClientError
        ? caught
        : new ApiClientError("An unexpected conversion error occurred.", 0, "CONVERSION_ERROR");
    if (error.code === "REQUEST_CANCELLED") {
      return { ok: false, reason: "stale", message: "The conversion request was cancelled." };
    }
    const stored = useAutomatonStore
      .getState()
      .failConversion(requestId, revision, error.code, error.message);
    return stored
      ? { ok: false, reason: "error", message: error.message }
      : {
          ok: false,
          reason: "stale",
          message: "The NFA changed before the conversion error was received.",
        };
  } finally {
    if (activeController === controller) activeController = null;
  }
}

export function cancelActiveConversion() {
  activeController?.abort();
  activeController = null;
}

function validationMessage(status: ConversionReadinessStatus): string {
  if (status === "invalid") return "Resolve the validation errors before converting.";
  if (status === "unavailable") return "Backend validation is unavailable.";
  if (status === "validating") return "Wait for validation to finish.";
  if (status === "incomplete") return "Complete the NFA before converting.";
  return "The NFA is not ready for conversion.";
}
