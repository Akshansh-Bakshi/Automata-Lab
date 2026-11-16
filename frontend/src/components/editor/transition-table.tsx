"use client";

import type { NfaDocument } from "@/lib/api/types";
import { useAutomatonStore } from "@/store/automaton-store";

export function TransitionTable({ document }: { document: NfaDocument }) {
  const setTransitionTargets = useAutomatonStore((state) => state.setTransitionTargets);

  if (!document.states.length || !document.alphabet.length) {
    return (
      <p className="dock-empty">
        Add at least one state and alphabet symbol to edit the transition table.
      </p>
    );
  }

  const targetsFor = (source: string, symbol: string) =>
    document.transitions.find(
      (transition) => transition.from === source && transition.symbol === symbol,
    )?.to ?? [];

  return (
    <div className="editable-transition-table-wrap">
      <table className="editable-transition-table">
        <caption>
          NFA transition function. Open any cell to edit its target-state set.
        </caption>
        <thead>
          <tr>
            <th scope="col">State</th>
            {document.alphabet.map((symbol) => (
              <th scope="col" key={symbol}><code>{symbol}</code></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {document.states.map((source) => (
            <tr key={source}>
              <th scope="row">
                <code>{source}</code>
                {source === document.initialState ? <small>start</small> : null}
              </th>
              {document.alphabet.map((symbol) => {
                const targets = targetsFor(source, symbol);
                return (
                  <td key={symbol}>
                    <details className="transition-cell">
                      <summary aria-label={`Edit transition from ${source} on ${symbol}`}>
                        {targets.length ? `{ ${targets.join(", ")} }` : "∅"}
                      </summary>
                      <div className="transition-cell__picker">
                        <strong>δ({source}, {symbol})</strong>
                        {document.states.map((target) => (
                          <label key={target}>
                            <input
                              type="checkbox"
                              checked={targets.includes(target)}
                              onChange={() =>
                                setTransitionTargets(
                                  source,
                                  symbol,
                                  targets.includes(target)
                                    ? targets.filter((candidate) => candidate !== target)
                                    : [...targets, target],
                                )
                              }
                            />
                            {target}
                          </label>
                        ))}
                      </div>
                    </details>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
