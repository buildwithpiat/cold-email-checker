import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  const { to, company, name } = await req.json();

  // 1. QWEN GENERA EL EMAIL
  const qwenKey = process.env.QWEN_API_KEY;
  let emailBody = `Hola ${name}, vi que están en ${company} y creo que Qwen les puede ayudar...`;

  if (qwenKey) {
    try {
      const qwenRes = await fetch("https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${qwenKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "qwen-plus",
          messages: [
            { role: "system", content: "Eres experto en cold email. Escribe un cold email corto, en español, no spammy, para vender automatización con Qwen. Firma como Equipo Qwen." },
            { role: "user", content: `Escribe cold email para ${name} en ${company}` }
          ]
        })
      });
      const qwenData = await qwenRes.json();
      if (qwenData.choices?.[0]?.message?.content) {
        emailBody = qwenData.choices[0].message.content;
      }
    } catch (e) {
      console.log("Qwen error, usando plantilla");
    }
  }

  // 2. MANDA CON piat2072@gmail.com
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER, // piat2072@gmail.com
      pass: process.env.EMAIL_PASS, // App Password de Gmail
    }
  });

  await transporter.sendMail({
    from: `"Qwen Project" <${process.env.EMAIL_USER}>`,
    to,
    subject: `Idea rápida para ${company}`,
    text: emailBody,
  });

  return NextResponse.json({ success: true, sentTo: to, preview: emailBody });
}
