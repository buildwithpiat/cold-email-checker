"use client";

import { useState } from "react";
import type { CheckResult, CheckError } from "@/lib/types";
import FixCard from "@/components/FixCard";
import EmailCapture from "@/components/EmailCapture";

type ResultState = CheckResult | { error: string };

const isError = (r: ResultState): r is CheckError => "error" in r;

/** Dominio claramente inválido en el cliente (validación fuerte va en la API). */
function looksLikeDomain(input: string): boolean {
  return /^(?!-)(?:[a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,}$/.test(
    input.trim().toLowerCase().replace(/^[a-z]+:\/\/|\/.*$/g, "")
  );
}

export default function Home() {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResultState | null>(null);
  const [inputError, setInputError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInputError("");

    if (!looksLikeDomain(domain)) {
      setInputError("Introduce un dominio válido, p. ej. yourcompany.com");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domain.trim() }),
      });
      const data: ResultState = await res.json();
      setResult(data);
    } catch {
      setResult({
        error: "No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.",
      });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setDomain("");
    setInputError("");
  };

  const scoreColor =
    result && !isError(result)
      ? result.score >= 80
        ? "#00FF88"
        : result.score >= 60
          ? "#FFAA00"
          : "#FF3366"
      : "#ffffff";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0A0A0A",
        color: "white",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <main
        style={{ maxWidth: "800px", margin: "0 auto", padding: "80px 24px" }}
      >
        {/* Header */}
        <header style={{ textAlign: "center", marginBottom: "64px" }}>
          <div
            style={{
              display: "inline-block",
              padding: "8px 16px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "9999px",
              fontSize: "12px",
              color: "#9CA3AF",
              marginBottom: "24px",
            }}
          >
            Free Domain Deliverability Checker
          </div>
          <h1
            style={{
              fontSize: "clamp(32px, 6vw, 48px)",
              fontWeight: "bold",
              marginBottom: "16px",
              letterSpacing: "-0.025em",
            }}
          >
            Is Your Cold Email Domain{" "}
            <span style={{ color: "#00D4FF" }}>Burned?</span>
          </h1>
          <p
            style={{
              fontSize: "18px",
              color: "#9CA3AF",
              maxWidth: "560px",
              margin: "0 auto",
            }}
          >
            Check SPF, DKIM, DMARC and blacklist status in 10 seconds. Get the
            exact fix to copy-paste.
          </p>
        </header>

        {/* Input Form */}
        {!result && (
          <form onSubmit={handleSubmit} style={{ maxWidth: "512px", margin: "0 auto" }}>
            <div style={{ display: "flex", gap: "8px" }}>
              <label
                htmlFor="domain-input"
                style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}
              >
                Dominio a comprobar
              </label>
              <input
                id="domain-input"
                type="text"
                inputMode="url"
                autoComplete="off"
                aria-invalid={!!inputError}
                aria-describedby={inputError ? "domain-error" : undefined}
                value={domain}
                onChange={(e) => {
                  setDomain(e.target.value);
                  if (inputError) setInputError("");
                }}
                placeholder="yourcompany.com"
                disabled={loading}
                style={{
                  flex: 1,
                  padding: "16px 20px",
                  background: "rgba(255,255,255,0.05)",
                  border: `1px solid ${inputError ? "#FF3366" : "rgba(255,255,255,0.1)"}`,
                  borderRadius: "8px",
                  color: "white",
                  fontSize: "18px",
                  outline: "none",
                }}
              />
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: "16px 32px",
                  background: "#00D4FF",
                  color: "black",
                  fontWeight: 600,
                  borderRadius: "8px",
                  border: "none",
                  cursor: loading ? "wait" : "pointer",
                  fontSize: "16px",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? "Checking…" : "Check"}
              </button>
            </div>
            {inputError && (
              <p
                id="domain-error"
                role="alert"
                style={{ fontSize: "14px", color: "#FF3366", marginTop: "12px", textAlign: "center" }}
              >
                {inputError}
              </p>
            )}
            <p
              style={{
                fontSize: "12px",
                color: "#6B7280",
                marginTop: "12px",
                textAlign: "center",
              }}
            >
              No login required. Results in ~10 seconds.
            </p>
          </form>
        )}

        {/* Error state */}
        {result && isError(result) && (
          <div
            role="alert"
            style={{
              padding: "32px",
              background: "rgba(255,51,102,0.1)",
              border: "1px solid rgba(255,51,102,0.3)",
              borderRadius: "16px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>✗</div>
            <h2 style={{ fontSize: "20px", fontWeight: 600, color: "#FF3366", marginBottom: "8px" }}>
              Something went wrong
            </h2>
            <p style={{ color: "#9CA3AF", marginBottom: "24px" }}>{result.error}</p>
            <button
              onClick={reset}
              style={{
                fontSize: "14px",
                color: "#00D4FF",
                background: "none",
                border: "1px solid #00D4FF",
                borderRadius: "8px",
                padding: "10px 24px",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        )}

        {/* Results */}
        {result && !isError(result) && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Score */}
            <section
              aria-live="polite"
              style={{
                textAlign: "center",
                padding: "48px 24px",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "16px",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <div style={{ fontSize: "14px", color: "#9CA3AF", marginBottom: "8px" }}>
                Deliverability Score — {result.domain}
              </div>
              <div
                style={{ fontSize: "96px", fontWeight: "bold", color: scoreColor, lineHeight: 1 }}
                aria-label={`Puntuación ${result.score} sobre 100`}
              >
                {result.score}
              </div>
              <div style={{ fontSize: "14px", color: "#6B7280", marginTop: "8px" }}>
                out of 100
              </div>
              <p style={{ marginTop: "16px", fontSize: "16px" }}>{result.verdict}</p>
              <button
                onClick={reset}
                style={{
                  marginTop: "24px",
                  fontSize: "14px",
                  color: "#9CA3AF",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Check another domain
              </button>
            </section>

            {/* Issues */}
            {(result.spf.status !== "pass" ||
              result.dkim.status !== "pass" ||
              result.dmarc.status !== "pass" ||
              result.blacklists.status === "fail") && (
              <section aria-labelledby="issues-heading" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <h2 id="issues-heading" style={{ fontSize: "20px", fontWeight: 600 }}>
                  Issues Found
                </h2>

                {result.spf.status !== "pass" && (
                  <FixCard
                    id="spf"
                    title={result.spf.status === "missing" ? "SPF Record Missing" : "SPF Record Invalid"}
                    description="Emails may be marked as spam"
                    item={result.spf}
                  />
                )}

                {result.dkim.status !== "pass" && (
                  <FixCard
                    id="dkim"
                    title={result.dkim.status === "missing" ? "DKIM Not Configured" : "DKIM Record Invalid"}
                    description="Emails lack authentication signature"
                    item={result.dkim}
                  />
                )}

                {result.dmarc.status !== "pass" && (
                  <FixCard
                    id="dmarc"
                    title={result.dmarc.status === "missing" ? "DMARC Record Missing" : "DMARC Record Invalid"}
                    description="No protection against spoofing"
                    item={result.dmarc}
                  />
                )}

                {result.blacklists.status === "fail" && (
                  <div
                    style={{
                      padding: "20px",
                      background: "rgba(255,51,102,0.1)",
                      border: "1px solid rgba(255,51,102,0.3)",
                      borderRadius: "8px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                      <span aria-hidden="true" style={{ fontSize: "20px", color: "#FF3366" }}>✗</span>
                      <div>
                        <div style={{ fontWeight: 600, color: "#FF3366" }}>
                          Blacklisted on {result.blacklists.count} list(s)
                        </div>
                        <div style={{ fontSize: "14px", color: "#9CA3AF" }}>
                          Your sending IP/domain is blocked
                        </div>
                      </div>
                    </div>
                    <ul style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "12px", paddingLeft: "4px", listStyle: "none" }}>
                      {result.blacklists.lists.map((list) => (
                        <li key={list} style={{ fontSize: "14px", color: "#D1D5DB" }}>
                          • {list}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}

            {/* Perfect Score */}
            {result.score >= 100 && (
              <section
                style={{
                  padding: "32px",
                  background: "rgba(0,255,136,0.1)",
                  border: "1px solid rgba(0,255,136,0.3)",
                  borderRadius: "8px",
                  textAlign: "center",
                }}
              >
                <div aria-hidden="true" style={{ fontSize: "36px", marginBottom: "12px" }}>✓</div>
                <h3 style={{ fontSize: "20px", fontWeight: 600, color: "#00FF88", marginBottom: "8px" }}>
                  Perfect Configuration
                </h3>
                <p style={{ color: "#9CA3AF" }}>
                  Your domain is properly configured for cold email.
                </p>
              </section>
            )}

            {/* Email Capture */}
            {result.score < 100 && (
              <EmailCapture domain={result.domain} score={result.score} />
            )}

            {/* Stripe CTA */}
            <section
              style={{
                padding: "32px",
                background: "linear-gradient(135deg, rgba(255,255,255,0.05), transparent)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "16px",
                textAlign: "center",
              }}
            >
              <h2 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "8px" }}>
                Never let your domain burn again
              </h2>
              <p style={{ color: "#9CA3AF", marginBottom: "24px" }}>
                Weekly automated checks + instant blacklist alerts
              </p>
              <a
                href={process.env.NEXT_PUBLIC_STRIPE_LINK || "#pricing"}
                style={{
                  display: "inline-block",
                  padding: "16px 32px",
                  background: "#00D4FF",
                  color: "black",
                  fontWeight: "bold",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontSize: "18px",
                }}
              >
                Get Weekly Monitoring — $25/mo
              </a>
              <p style={{ fontSize: "12px", color: "#6B7280", marginTop: "12px" }}>
                Cancel anytime. 7-day free trial.
              </p>
            </section>
          </div>
        )}

        {/* Footer */}
        <footer
          style={{
            marginTop: "80px",
            textAlign: "center",
            fontSize: "14px",
            color: "#4B5563",
          }}
        >
          Built for cold email professionals. Check unlimited domains for free.
        </footer>
      </main>
    </div>
  );
}
