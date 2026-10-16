import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { domain } = await req.json();
  if (!domain) return NextResponse.json({ error: "No domain" }, { status: 400 });

  try {
    const [txt, mx, dmarc, spam] = await Promise.all([
      fetch(`https://dns.google/resolve?name=${domain}&type=TXT`).then(r=>r.json()),
      fetch(`https://dns.google/resolve?name=${domain}&type=MX`).then(r=>r.json()),
      fetch(`https://dns.google/resolve?name=_dmarc.${domain}&type=TXT`).then(r=>r.json()),
      fetch(`https://dns.google/resolve?name=${domain}&type=A`).then(r=>r.json()),
    ]);

    const hasMX = (mx.Answer?.length || 0) > 0;
    const hasSPF = JSON.stringify(txt.Answer || "").includes("v=spf1");
    const hasDMARC = (dmarc.Answer?.length || 0) > 0;
    
    let score = 0;
    if (hasMX) score += 30;
    if (hasSPF) score += 35;
    if (hasDMARC) score += 35;

    const isBurned = score < 50;

    return NextResponse.json({
      domain,
      score,
      isBurned,
      details: { hasMX, hasSPF, hasDMARC, txt: txt.Answer, mx: mx.Answer, dmarc: dmarc.Answer },
      verdict: isBurned ? "🔴 DOMINIO QUEMADO - No uses para cold email" : score < 80 ? "🟡 RIESGO MEDIO - Calienta más" : "🟢 LIMPIO - Listo para Qwen"
    });
  } catch (e) {
    return NextResponse.json({ error: "Error checking" }, { status: 500 });
  }
}
