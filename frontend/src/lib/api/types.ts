import type { components } from "./generated";

export type HealthResponse = components["schemas"]["HealthResponse"];
export type ExamplesResponse = components["schemas"]["ExamplesResponse"];
export type Example = components["schemas"]["ExampleSchema"];
export type NfaDocument = components["schemas"]["NfaSchema"];
export type NfaRequest = components["schemas"]["NfaRequest"];
export type ValidationResponse = components["schemas"]["ValidationResponse"];
export type ConversionResponse = components["schemas"]["ConversionResponse"];
export type DfaDocument = components["schemas"]["DfaSchema"];
export type DfaState = components["schemas"]["DfaStateSchema"];
export type DfaTransition = components["schemas"]["DfaTransitionSchema"];
export type DfaStats = components["schemas"]["DfaStatsSchema"];
export type ConversionTrace = components["schemas"]["ConversionTraceSchema"];
export type ConversionTraceStep = ConversionTrace["steps"][number];
export type SimulationRequest = components["schemas"]["SimulationRequest"];
export type SimulationResponse = components["schemas"]["SimulationResponse"];
export type ErrorResponse = components["schemas"]["ErrorResponse"];
export type ApiIssue = components["schemas"]["IssueSchema"];

