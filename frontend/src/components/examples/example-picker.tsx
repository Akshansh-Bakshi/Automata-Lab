"use client";

import { ArrowRight, BookOpen, Check, Library, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Example } from "@/lib/api/types";
import { ErrorNotice } from "@/components/ui/error-notice";
import { LoadingState } from "@/components/ui/loading-state";

interface ExamplePickerProps {
  examples: Example[];
  status: "loading" | "ready" | "empty" | "error";
  error: string | null;
  selectedId: string | null;
  onSelect: (example: Example) => void;
  onRetry: () => void;
}

export function ExamplePicker({
  examples,
  status,
  error,
  selectedId,
  onSelect,
  onRetry,
}: ExamplePickerProps) {
  const [open, setOpen] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);
  const triggerButton = useRef<HTMLButtonElement>(null);

  const closeDialog = () => {
    setOpen(false);
    window.setTimeout(() => triggerButton.current?.focus(), 0);
  };

  useEffect(() => {
    if (open) closeButton.current?.focus();
  }, [open]);

  return (
    <>
      <button
        ref={triggerButton}
        className="header-action"
        type="button"
        aria-label="Examples"
        onClick={() => setOpen(true)}
      >
        <Library size={16} aria-hidden="true" />
        <span>Examples</span>
      </button>
      {open ? (
        <div className="dialog-backdrop" role="presentation" onMouseDown={closeDialog}>
          <section
            className="example-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="example-dialog-title"
            onMouseDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Escape") closeDialog();
            }}
          >
            <header className="example-dialog__header">
              <div className="dialog-heading">
                <div className="dialog-heading__icon" aria-hidden="true">
                  <BookOpen size={20} />
                </div>
                <div>
                  <p className="eyebrow">Curated automata</p>
                  <h2 id="example-dialog-title">Open an example</h2>
                  <p>Load a tested NFA from the AutomataLab backend.</p>
                </div>
              </div>
              <button
                ref={closeButton}
                className="icon-button"
                type="button"
                aria-label="Close example browser"
                onClick={closeDialog}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>
            <div className="example-dialog__body">
              {status === "loading" ? <LoadingState label="Loading examples…" /> : null}
              {status === "error" ? (
                <ErrorNotice
                  title="Examples are unavailable"
                  message={error ?? "The example service could not be reached."}
                  onRetry={onRetry}
                />
              ) : null}
              {status === "empty" ? (
                <p className="quiet-message" role="status">
                  The backend returned no examples.
                </p>
              ) : null}
              {status === "ready" ? (
                <div className="example-grid">
                  {examples.map((example) => (
                    <button
                      className="example-card"
                      data-selected={selectedId === example.id}
                      type="button"
                      key={example.id}
                      onClick={() => {
                        onSelect(example);
                        closeDialog();
                      }}
                    >
                      <span className="example-card__check" aria-hidden="true">
                        {selectedId === example.id ? <Check size={13} /> : null}
                      </span>
                      <span className="example-card__title">{example.name}</span>
                      <span className="example-card__description">{example.description}</span>
                      <span className="example-card__meta">
                        {example.nfa.states.length} states · {example.nfa.alphabet.length} symbols
                        <ArrowRight size={14} aria-hidden="true" />
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

