"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiClientError, getExamples } from "@/lib/api/client";
import type { Example } from "@/lib/api/types";

type ExamplesStatus = "loading" | "ready" | "empty" | "error";

export function useExamples() {
  const [examples, setExamples] = useState<Example[]>([]);
  const [status, setStatus] = useState<ExamplesStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await getExamples({ signal });
      setExamples(response.examples);
      setStatus(response.examples.length > 0 ? "ready" : "empty");
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.code === "REQUEST_CANCELLED") {
        return;
      }
      setError(caught instanceof Error ? caught.message : "Examples could not be loaded.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void load(controller.signal), 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [load]);

  const retry = () => {
    setStatus("loading");
    setError(null);
    void load();
  };

  return { examples, status, error, retry };
}

