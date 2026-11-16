"use client";

import { ChevronDown, Download, FileJson, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { NfaDocument } from "@/lib/api/types";

export function DocumentActions({ document: nfaDocument }: { document: NfaDocument | null }) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const exportDocument = () => {
    if (!nfaDocument) return;
    const blob = new Blob([JSON.stringify(nfaDocument, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = `${nfaDocument.name?.trim().replaceAll(/\s+/g, "-").toLowerCase() || "automaton"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  return (
    <div className="document-actions" ref={container}>
      <button className="header-action" type="button" onClick={() => setOpen((value) => !value)}>
        <FileJson size={16} aria-hidden="true" />
        <span>Import / export</span>
        <ChevronDown size={13} aria-hidden="true" />
      </button>
      {open ? (
        <div className="action-menu" role="menu" aria-label="Document actions">
          <div className="action-menu__item action-menu__item--disabled" role="menuitem">
            <Upload size={16} aria-hidden="true" />
            <span>
              <strong>Import JSON</strong>
              <small>Available with the Phase 5 editor</small>
            </span>
          </div>
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
              <small>{nfaDocument ? "Download canonical JSON" : "Load an example first"}</small>
            </span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

