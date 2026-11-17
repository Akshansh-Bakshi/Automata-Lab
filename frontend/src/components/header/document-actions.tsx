"use client";

import { AlertCircle, ChevronDown, Download, FileJson, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ApiClientError, validateNfa } from "@/lib/api/client";
import type { ApiIssue, NfaDocument } from "@/lib/api/types";
import {
  getEditorReadiness,
  ImportDocumentError,
  parseNfaJson,
  serializeNfa,
} from "@/lib/editor/nfa-document";
import { useAutomatonStore } from "@/store/automaton-store";

export function DocumentActions({ document: nfaDocument }: { document: NfaDocument | null }) {
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [issues, setIssues] = useState<ApiIssue[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const replaceDocument = useAutomatonStore((state) => state.replaceDocument);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const exportDocument = () => {
    if (!nfaDocument) return;
    const blob = new Blob([serializeNfa(nfaDocument)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = `${nfaDocument.name?.trim().replaceAll(/\s+/g, "-").toLowerCase() || "automaton"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  const importDocument = async (file: File) => {
    setImporting(true);
    setIssues([]);
    setMessage(null);
    try {
      const parsed = parseNfaJson(await file.text());
      const readiness = getEditorReadiness(parsed);
      if (readiness.status === "incomplete") throw new ImportDocumentError(readiness.issues);
      await validateNfa(parsed);
      replaceDocument(parsed);
      setMessage(`Imported ${parsed.name || file.name}.`);
    } catch (caught) {
      if (caught instanceof ImportDocumentError) setIssues(caught.issues);
      else if (caught instanceof ApiClientError) {
        setIssues(
          caught.issues.length
            ? caught.issues
            : [{ code: caught.code, path: "backend", message: caught.message }],
        );
      } else {
        setIssues([
          {
            code: "IMPORT_FAILED",
            path: "document",
            message: caught instanceof Error ? caught.message : "The document could not be imported.",
          },
        ]);
      }
    } finally {
      setImporting(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  return (
    <div
      className="document-actions"
      ref={container}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
    >
      <button
        className="header-action"
        type="button"
        aria-label="Import / export"
        aria-expanded={open}
        onClick={() => {
          setOpen((value) => !value);
          setIssues([]);
          setMessage(null);
        }}
      >
        <FileJson size={16} aria-hidden="true" />
        <span>Import / export</span>
        <ChevronDown size={13} aria-hidden="true" />
      </button>
      <input
        ref={fileInput}
        className="sr-only"
        type="file"
        accept="application/json,.json"
        aria-label="Choose NFA JSON file"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void importDocument(file);
        }}
      />
      {open ? (
        <div className="action-menu" role="menu" aria-label="Document actions">
          <button
            className="action-menu__item"
            type="button"
            role="menuitem"
            disabled={importing}
            onClick={() => fileInput.current?.click()}
          >
            <Upload size={16} aria-hidden="true" />
            <span>
              <strong>{importing ? "Validating import…" : "Import JSON"}</strong>
              <small>Structure and semantics are checked before replacing this document</small>
            </span>
          </button>
          <button
            className="action-menu__item"
            type="button"
            role="menuitem"
            disabled={!nfaDocument}
            onClick={exportDocument}
          >
            <Download size={16} aria-hidden="true" />
            <span>
              <strong>Export current NFA</strong>
              <small>{nfaDocument ? "Download deterministic API-compatible JSON" : "Create or load an NFA first"}</small>
            </span>
          </button>
          {message ? <p className="action-menu__success" role="status">{message}</p> : null}
          {issues.length ? (
            <div className="action-menu__errors" role="alert">
              <AlertCircle size={15} />
              <div>
                <strong>Import was not applied</strong>
                <ul>
                  {issues.slice(0, 4).map((entry) => (
                    <li key={`${entry.code}-${entry.path}`}>{entry.path}: {entry.message}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
