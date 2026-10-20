import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { isValidEmail, normalizeDomain, rateLimit } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

/** Genera un informe breve de los problemas detectados. */
function buildReport(data: { domain: string; score: number }): string {
  return [
    `Informe de entregabilidad para ${data.domain}`,
    "",
    `Puntuación actual: ${data.score}/100`,
    "",
    "Para recibir el monitoreo semanal automático y las instrucciones detalladas,",
    "responde este correo o agenda una demo: https://calendly.com/TU_USUARIO",
    "",
    "— Equipo Qwen",
  ].join("\n");
}

export async function POST(req: Request) {
  // Rate limit: 5 envíos de informe por minuto por IP.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = rateLimit(`lead:${ip}`, 5, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Espera un momento." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  if (!EMAIL_USER || !EMAIL_PASS) {
    return NextResponse.json(
      { error: "Servicio de correo no configurado." },
      { status: 500 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const domain = normalizeDomain(body.domain);
  const score =
    typeof body.score === "number" && body.score >= 0 && body.score <= 100
      ? Math.round(body.score)
      : null;

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Correo inválido" }, { status: 400 });
  }
  if (!domain || score === null) {
    return NextResponse.json(
      { error: "Faltan 'domain' o 'score', o son inválidos" },
      { status: 400 }
    );
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    });

    await transporter.sendMail({
      from: `"Domain Burned Checker" <${EMAIL_USER}>`,
      to: email,
      subject: `Tu informe de entregabilidad: ${domain}`,
      text: buildReport({ domain, score }),
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[/api/lead] error al enviar:", e);
    return NextResponse.json(
      { error: "No se pudo enviar el informe. Inténtalo más tarde." },
      { status: 502 }
    );
  }
}
