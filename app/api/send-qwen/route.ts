import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { isValidEmail, rateLimit } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Validación de configuración al arrancar el módulo (falla temprano en deploy).
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const QWEN_API_KEY = process.env.QWEN_API_KEY;

/** Fetch con timeout para llamadas a servicios externos. */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 15_000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Genera el cuerpo del email con Qwen; si no hay clave o falla, usa plantilla. */
async function generateEmail(name: string, company: string): Promise<string> {
  if (!QWEN_API_KEY) {
    return `Hola ${name}, vi que están en ${company} y creo que la automatización con IA puede ayudarles a ahorrar horas cada semana. ¿Tienen 10 minutos esta semana?`;
  }
  try {
    const qwenRes = await fetchWithTimeout(
      "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${QWEN_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "qwen-plus",
          messages: [
            {
              role: "system",
              content:
                "Eres experto en cold email. Escribe un cold email corto, en español, no spammy, para vender automatización con Qwen. Firma como Equipo Qwen.",
            },
            { role: "user", content: `Escribe cold email para ${name} en ${company}` },
          ],
        }),
      }
    );
    if (!qwenRes.ok) throw new Error(`Qwen API ${qwenRes.status}`);
    const data = await qwenRes.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content === "string" && content.trim()) return content;
  } catch (e) {
    console.warn("[/api/send-qwen] Qwen falló, usando plantilla:", (e as Error).message);
  }
  return `Hola ${name}, vi que están en ${company} y creo que la automatización con IA puede ayudarles a ahorrar horas cada semana. ¿Tienen 10 minutos esta semana?`;
}

export async function POST(req: Request) {
  // Rate limit estricto: este endpoint envía correos reales (3 por minuto por IP).
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = rateLimit(`send:${ip}`, 3, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Demasiados envíos. Espera antes de volver a intentar." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  if (!EMAIL_USER || !EMAIL_PASS) {
    return NextResponse.json(
      { error: "Servicio de correo no configurado (faltan EMAIL_USER/EMAIL_PASS)." },
      { status: 500 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const to = typeof body.to === "string" ? body.to.trim().toLowerCase() : "";
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 100) : "";
  const company =
    typeof body.company === "string" ? body.company.trim().slice(0, 100) : "";

  if (!isValidEmail(to)) {
    return NextResponse.json({ error: "Correo destino inválido" }, { status: 400 });
  }
  if (!name || !company) {
    return NextResponse.json(
      { error: "Faltan campos 'name' o 'company'" },
      { status: 400 }
    );
  }
  // Evitar bucles / envío a nuestro propio remitente.
  if (to === EMAIL_USER.toLowerCase()) {
    return NextResponse.json({ error: "No puedes enviarte a ti mismo" }, { status: 400 });
  }

  try {
    const emailBody = await generateEmail(name, company);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    });

    const info = await transporter.sendMail({
      from: `"Qwen Project" <${EMAIL_USER}>`,
      to,
      subject: `Idea rápida para ${company}`,
      text: emailBody,
    });

    return NextResponse.json({
      success: true,
      sentTo: to,
      messageId: info.messageId,
      preview: emailBody,
    });
  } catch (e) {
    console.error("[/api/send-qwen] error al enviar:", e);
    return NextResponse.json(
      { error: "No se pudo enviar el correo. Inténtalo más tarde." },
      { status: 502 }
    );
  }
}
