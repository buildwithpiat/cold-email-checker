import { NextResponse } from "next/server";
import { resolve, txtValues, findDkimRecord, checkBlacklists } from "@/lib/dns";
import { normalizeDomain, rateLimit } from "@/lib/validation";
import type { CheckResult, CheckItem } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SPF_FIX = "v=spf1 include:_spf.google.com ~all"; // ejemplo común; ajustar al ESP real
const DMARC_FIX = "v=DMARC1; p=none; rua=mailto:dmarc@TU_DOMINIO.com";

/** Analiza un registro SPF y detecta errores comunes. */
function evaluateSpf(records: string[]): CheckItem {
  const spf = records.find((r) => r.toLowerCase().startsWith("v=spf1"));
  if (!spf) {
    return { status: "missing", fix: SPF_FIX };
  }
  const problems: string[] = [];
  const mechanisms = spf.split(/\s+/);
  const hasAll = mechanisms.some((m) => /^(-|\+|~|\?)all$/i.test(m));
  if (!hasAll) problems.push("falta el mecanismo 'all'");
  const includes = mechanisms.filter((m) => /^include:/i.test(m)).length;
  if (includes > 10) problems.push(`demasiados 'include' (${includes}, máximo 10)`);
  if (/ptr=/i.test(spf)) problems.push("'ptr=' está obsoleto y penaliza la entrega");
  if (/\+all/i.test(spf)) problems.push("'+all' permite spoofing total");

  if (problems.length > 0) {
    return { status: "fail", value: spf, fix: SPF_FIX };
  }
  return { status: "pass", value: spf };
}

/** Analiza un registro DMARC y valida su sintaxis básica. */
function evaluateDmarc(records: string[], domain: string): CheckItem {
  const dmarc = records.find((r) => r.toLowerCase().startsWith("v=dmarc1"));
  if (!dmarc) {
    return { status: "missing", fix: DMARC_FIX.replace("TU_DOMINIO.com", domain) };
  }
  const problems: string[] = [];
  if (!/\bp=(none|quarantine|reject)\b/i.test(dmarc)) {
    problems.push("falta la política 'p='");
  }
  const rua = dmarc.match(/\brua=([^;\s]+)/i)?.[1];
  if (rua && !/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+/i.test(rua)) {
    problems.push("la etiqueta 'rua=' no es una dirección de correo válida");
  }
  if (problems.length > 0) {
    return {
      status: "fail",
      value: dmarc,
      fix: `v=DMARC1; p=none; rua=mailto:dmarc@${domain}`,
    };
  }
  return { status: "pass", value: dmarc };
}

export async function POST(req: Request) {
  // Rate limit: 20 chequeos por minuto por IP.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = rateLimit(`check:${ip}`, 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Demasiadas peticiones. Espera antes de volver a intentarlo." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  let domain: string | null = null;
  try {
    const body = await req.json();
    domain = normalizeDomain(body?.domain);
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  if (!domain) {
    return NextResponse.json(
      { error: "Dominio inválido. Ejemplo: yourcompany.com" },
      { status: 400 }
    );
  }

  try {
    // Consultas paralelas: TXT raíz, MX, DMARC, DKIM y blacklists.
    const [txtRes, mxRes, dmarcRes, dkimRec, blacklistRes] = await Promise.all([
      resolve(domain, "TXT"),
      resolve(domain, "MX"),
      resolve(`_dmarc.${domain}`, "TXT"),
      findDkimRecord(domain),
      checkBlacklists(domain).catch(() => ({
        lists: [],
        checked: 0,
        skipped: true,
      })),
    ]);

    const rootTxt = txtValues(txtRes.answers);
    const dmarcTxt = txtValues(dmarcRes.answers);

    const spf = evaluateSpf(rootTxt);
    const dmarc = evaluateDmarc(dmarcTxt, domain);

    const dkim: CheckItem = dkimRec
      ? {
          status: "pass",
          value: `${dkimRec.selector}._domainkey → ${dkimRec.value.slice(0, 80)}…`,
        }
      : {
          status: "missing",
          fix: "Activa DKIM en tu proveedor de correo (Google Workspace / Microsoft 365 / SendGrid) y añade el registro TXT del selector en DNS.",
        };

    const mxConfigured = mxRes.answers.some((a) => a.type === 15);
    const blacklists = blacklistRes.skipped
      ? { status: "unknown" as const, count: 0, lists: [] }
      : {
          status: blacklistRes.lists.length > 0 ? ("fail" as const) : ("pass" as const),
          count: blacklistRes.lists.length,
          lists: blacklistRes.lists,
        };

    // Puntuación: MX 10, SPF 30, DKIM 30, DMARC 20, sin blacklists 10.
    let score = 0;
    if (mxConfigured) score += 10;
    if (spf.status === "pass") score += 30;
    else if (spf.status === "fail") score += 10;
    if (dkim.status === "pass") score += 30;
    if (dmarc.status === "pass") score += 20;
    else if (dmarc.status === "fail") score += 5;
    if (blacklists.status === "pass") score += 10;
    if (blacklists.status === "fail") score = Math.max(0, score - 40);

    const verdict =
      blacklists.status === "fail" || score < 40
        ? "🔴 DOMINIO QUEMADO — No lo uses para cold email"
        : score < 80
          ? "🟡 RIESGO MEDIO — Corrige los problemas y calienta el dominio"
          : "🟢 LIMPIO — Listo para enviar";

    const result: CheckResult = {
      domain,
      score,
      verdict,
      spf,
      dkim,
      dmarc,
      blacklists,
      mxConfigured,
      checkedAt: new Date().toISOString(),
    };

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (e) {
    console.error("[/api/check] error:", e);
    return NextResponse.json(
      { error: "No pudimos completar el chequeo. Inténtalo de nuevo." },
      { status: 502 }
    );
  }
}
