"use client";

import { useState } from "react";

interface EmailCaptureProps {
  domain: string;
  score: number;
}

/** Captura de lead: envía el informe por correo vía /api/lead. */
export default function EmailCapture({ domain, score }: EmailCaptureProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || status === "sending") return;
    setStatus("sending");
    setErrorMsg("");
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, domain, score }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "No se pudo enviar el informe.");
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Error inesperado.");
    }
  };

  if (status === "sent") {
    return (
      <div
        role="status"
        style={{
          padding: "24px",
          background: "rgba(0,255,136,0.1)",
          border: "1px solid rgba(0,255,136,0.3)",
          borderRadius: "8px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "24px", marginBottom: "8px" }}>✓</div>
        <h3 style={{ fontWeight: 600, color: "#00FF88" }}>Informe enviado a {email}</h3>
        <p style={{ fontSize: "14px", color: "#9CA3AF", marginTop: "4px" }}>
          Revisa tu bandeja de entrada (y la carpeta de spam).
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={send}
      style={{
        padding: "24px",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,170,0,0.3)",
        borderRadius: "8px",
      }}
    >
      <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>
        Recibe el informe completo por email
      </h3>
      <p style={{ fontSize: "14px", color: "#9CA3AF", marginBottom: "16px" }}>
        Te enviamos los pasos exactos para corregir tu dominio + prueba gratuita de
        monitoreo semanal.
      </p>
      <div style={{ display: "flex", gap: "8px" }}>
        <label htmlFor="lead-email" className="sr-only" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
          Tu correo electrónico
        </label>
        <input
          id="lead-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          aria-describedby="lead-email-hint"
          style={{
            flex: 1,
            padding: "12px 16px",
            background: "rgba(0,0,0,0.5)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px",
            color: "white",
            fontSize: "14px",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={status === "sending"}
          style={{
            padding: "12px 24px",
            background: "#00D4FF",
            color: "black",
            fontWeight: 600,
            borderRadius: "8px",
            border: "none",
            cursor: status === "sending" ? "wait" : "pointer",
            opacity: status === "sending" ? 0.7 : 1,
          }}
        >
          {status === "sending" ? "Enviando…" : "Enviar informe"}
        </button>
      </div>
      {status === "error" && (
        <p role="alert" style={{ fontSize: "14px", color: "#FF3366", marginTop: "12px" }}>
          {errorMsg}
        </p>
      )}
      <p id="lead-email-hint" style={{ fontSize: "12px", color: "#6B7280", marginTop: "8px" }}>
        Solo usamos tu correo para enviarte el informe. Sin spam.
      </p>
    </form>
  );
}
