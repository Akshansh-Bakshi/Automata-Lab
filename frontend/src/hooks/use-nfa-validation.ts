"use client";

import { useEffect, useState } from "react";
import { ApiClientError, validateNfa } from "@/lib/api/client";
import type { ApiIssue } from "@/lib/api/types";
import { getEditorReadiness } from "@/lib/editor/nfa-document";
import { useAutomatonStore } from "@/store/automaton-store";

export type NfaValidationState =
  | { status: "idle"; issues: []; warnings: [] }
  | { status: "incomplete"; issues: ApiIssue[]; warnings: [] }
  | { status: "validating"; issues: []; warnings: [] }
  | { status: "valid"; issues: []; warnings: ApiIssue[] }
  | { status: "invalid"; issues: ApiIssue[]; warnings: [] }
  | { status: "unavailable"; issues: ApiIssue[]; warnings: [] };

const idle: NfaValidationState = { status: "idle", issues: [], warnings: [] };

export function useNfaValidation(): NfaValidationState {
  const revision = useAutomatonStore((state) => state.documentRevision);
  const [validation, setValidation] = useState<NfaValidationState>(idle);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const document = useAutomatonStore.getState().document;
      if (!document) {
        setValidation(idle);
        return;
      }
      const readiness = getEditorReadiness(document);
      if (readiness.status === "incomplete") {
        setValidation({ status: "incomplete", issues: readiness.issues, warnings: [] });
        return;
      }
      setValidation({ status: "validating", issues: [], warnings: [] });
      try {
        const response = await validateNfa(document, { signal: controller.signal });
        setValidation({ status: "valid", issues: [], warnings: response.warnings });
      } catch (caught) {
        if (caught instanceof ApiClientError && caught.code === "REQUEST_CANCELLED") return;
        if (caught instanceof ApiClientError && caught.status === 422) {
          setValidation({
            status: "invalid",
            issues: caught.issues.length
              ? caught.issues
              : [{ code: caught.code, path: "document", message: caught.message }],
            warnings: [],
          });
          return;
        }
        setValidation({
          status: "unavailable",
          issues: [
            {
              code: caught instanceof ApiClientError ? caught.code : "NETWORK_ERROR",
              path: "backend",
              message:
                caught instanceof Error ? caught.message : "Backend validation is unavailable.",
            },
          ],
          warnings: [],
        });
      }
    }, 350);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [revision]);

  return validation;
}
