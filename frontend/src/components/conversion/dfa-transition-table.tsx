import { AlertTriangle, CheckCircle2, CircleDot, Skull } from "lucide-react";
import type { DfaDocument } from "@/lib/api/types";
import { inspectDfaContract } from "@/lib/conversion/dfa-graph-model";

export function DfaTransitionTable({ dfa }: { dfa: DfaDocument }) {
  const contractIssues = inspectDfaContract(dfa);
  if (contractIssues.length) {
    return (
      <div className="dfa-contract-error" role="alert">
        <AlertTriangle size={16} />
        <div>
          <strong>Incomplete DFA response</strong>
          <p>{contractIssues[0]}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dfa-transition-table-wrap">
      <table className="dfa-transition-table">
        <caption>Complete deterministic transition function returned by the backend.</caption>
        <thead>
          <tr>
            <th scope="col">DFA state</th>
            <th scope="col">NFA subset</th>
            {dfa.alphabet.map((symbol) => <th scope="col" key={symbol}><code>{symbol}</code></th>)}
          </tr>
        </thead>
        <tbody>
          {dfa.states.map((state) => (
            <tr key={state.id} data-dead={state.isDead}>
              <th scope="row">
                <span className="dfa-table-state">
                  <code>{state.id}</code>
                  {state.isInitial ? <CircleDot size={11} aria-label="Initial" /> : null}
                  {state.isAccepting ? <CheckCircle2 size={11} aria-label="Accepting" /> : null}
                  {state.isDead ? <Skull size={11} aria-label="Dead" /> : null}
                </span>
              </th>
              <td><code>{state.subset.length ? `{${state.subset.join(", ")}}` : "∅"}</code></td>
              {dfa.alphabet.map((symbol) => {
                const transition = dfa.transitions.find(
                  (candidate) => candidate.from === state.id && candidate.symbol === symbol,
                );
                return <td key={symbol}><code>{transition?.to}</code></td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
