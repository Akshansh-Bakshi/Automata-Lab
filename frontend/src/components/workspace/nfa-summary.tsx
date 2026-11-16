import { ArrowRight, CheckCircle2, CircleDot, Flag, GitBranch } from "lucide-react";
import type { NfaDocument } from "@/lib/api/types";

export function NfaSummary({ document, compact = false }: { document: NfaDocument; compact?: boolean }) {
  return (
    <article className={compact ? "nfa-summary nfa-summary--compact" : "nfa-summary"}>
      <header className="nfa-summary__header">
        <div>
          <p className="eyebrow">Loaded NFA</p>
          <h3>{document.name || "Untitled automaton"}</h3>
        </div>
        <div className="summary-metrics" aria-label="NFA statistics">
          <span>{document.states.length} states</span>
          <span>{document.alphabet.length} symbols</span>
          <span>{document.transitions.length} moves</span>
        </div>
      </header>
      <div className="nfa-summary__body">
        <section className="summary-section">
          <div className="summary-section__heading">
            <CircleDot size={15} aria-hidden="true" />
            <h4>States</h4>
          </div>
          <div className="state-list">
            {document.states.map((state) => {
              const initial = state === document.initialState;
              const accepting = document.acceptingStates.includes(state);
              return (
                <span className="state-chip" key={state}>
                  <strong>{state}</strong>
                  {initial ? (
                    <small title="Initial state">
                      <Flag size={11} aria-hidden="true" /> start
                    </small>
                  ) : null}
                  {accepting ? (
                    <small title="Accepting state">
                      <CheckCircle2 size={11} aria-hidden="true" /> accepting
                    </small>
                  ) : null}
                </span>
              );
            })}
          </div>
        </section>
        <section className="summary-section">
          <div className="summary-section__heading">
            <GitBranch size={15} aria-hidden="true" />
            <h4>Alphabet</h4>
          </div>
          <div className="symbol-list">
            {document.alphabet.map((symbol) => (
              <code key={symbol}>{symbol}</code>
            ))}
          </div>
        </section>
        <section className="summary-section summary-section--transitions">
          <div className="summary-section__heading">
            <ArrowRight size={15} aria-hidden="true" />
            <h4>Explicit transitions</h4>
          </div>
          {document.transitions.length ? (
            <div className="transition-table-wrap">
              <table className="transition-table">
                <thead>
                  <tr>
                    <th>From</th>
                    <th>Symbol</th>
                    <th>Targets</th>
                  </tr>
                </thead>
                <tbody>
                  {document.transitions.map((transition, index) => (
                    <tr key={`${transition.from}-${transition.symbol}-${index}`}>
                      <td><code>{transition.from}</code></td>
                      <td><code>{transition.symbol}</code></td>
                      <td>
                        {transition.to.map((target) => (
                          <code key={target}>{target}</code>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="quiet-message">No explicit transitions. Every move reaches ∅.</p>
          )}
        </section>
      </div>
    </article>
  );
}

