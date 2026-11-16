import { AlertCircle, CheckCircle2, CloudOff, LoaderCircle, PencilLine } from "lucide-react";
import type { NfaValidationState } from "@/hooks/use-nfa-validation";

export function ValidationStatus({ validation }: { validation: NfaValidationState }) {
  const meta = validationMeta[validation.status];
  const Icon = meta.icon;
  return (
    <div className="validation-status" data-status={validation.status} role="status">
      <Icon size={15} className={validation.status === "validating" ? "spin" : undefined} />
      <div>
        <strong>{meta.title}</strong>
        <span>{meta.description}</span>
      </div>
      {validation.issues.length || validation.warnings.length ? (
        <ul>
          {[...validation.issues, ...validation.warnings].slice(0, 3).map((entry) => (
            <li key={`${entry.code}-${entry.path}`}>{entry.message}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

const validationMeta = {
  idle: {
    icon: PencilLine,
    title: "No document",
    description: "Create or load an NFA to begin.",
  },
  incomplete: {
    icon: PencilLine,
    title: "Editing in progress",
    description: "Complete the required fields before backend validation.",
  },
  validating: {
    icon: LoaderCircle,
    title: "Checking NFA",
    description: "The backend is validating this revision.",
  },
  valid: {
    icon: CheckCircle2,
    title: "Valid NFA",
    description: "This document is ready for conversion.",
  },
  invalid: {
    icon: AlertCircle,
    title: "Invalid NFA",
    description: "Resolve the reported issue before conversion.",
  },
  unavailable: {
    icon: CloudOff,
    title: "Validation unavailable",
    description: "Local editing remains available while the backend is offline.",
  },
} as const;
