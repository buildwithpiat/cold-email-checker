"use client";

import { useState } from "react";
import type { CheckItem } from "@/lib/types";

interface FixCardProps {
  id: string;
  title: string;
  description: string;
  item: CheckItem;
}

/** Tarjeta reutilizable de problema + fix copy-paste (SPF, DKIM, DMARC…). */
export default function FixCard({ id, title, description, item }: FixCardProps) {
  const [copied, setCopied] = useState(false);

  const isFail = item.status === "fail";
  const accent = isFail ? "#FF3366" : "#FFAA00";

  const copy = async () => {
    if (!item.fix) return;
    try {
      await navigator.clipboard.writeText(item.fix);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard puede fallar sin HTTPS o permisos; no bloqueamos al usuario.
    }
  };

  return (
    <div
      style={{
        padding: "20px",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "8px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
        <span aria-hidden="true" style={{ fontSize: "20px", color: accent }}>
          {isFail ? "✗" : "⚠"}
        </span>
        <div>
          <div style={{ fontWeight: 600 }}>{title}</div>
          <div style={{ fontSize: "14px", color: "#9CA3AF" }}>{description}</div>
        </div>
      </div>

      {item.value && (
        <p
          style={{
            fontSize: "13px",
            color: "#6B7280",
            fontFamily: "monospace",
            wordBreak: "break-all",
            marginBottom: item.fix ? "12px" : 0,
          }}
        >
          Actual: {item.value}
        </p>
      )}

      {item.fix && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(0,0,0,0.5)",
            padding: "12px",
            borderRadius: "6px",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <code
            style={{ flex: 1, fontSize: "14px", color: "#00D4FF", fontFamily: "monospace", wordBreak: "break-all" }}
          >
            {item.fix}
          </code>
          <button
            type="button"
            onClick={copy}
            aria-label={`Copiar registro de ${id}`}
            style={{
              padding: "4px 12px",
              background: "rgba(255,255,255,0.1)",
              border: "none",
              borderRadius: "4px",
              color: "white",
              cursor: "pointer",
              fontSize: "14px",
              whiteSpace: "nowrap",
            }}
          >
            {copied ? "✓ Copiado" : "Copiar"}
          </button>
        </div>
      )}
    </div>
  );
}
