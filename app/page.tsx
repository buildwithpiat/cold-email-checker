"use client";
import { useState } from "react";

export default function Home() {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const checkDomain = async () => {
    setLoading(true);
    try {
      const res = await fetch(`https://dns.google/resolve?name=${domain}&type=TXT`);
      const mxRes = await fetch(`https://dns.google/resolve?name=${domain}&type=MX`);
      const dmarcRes = await fetch(`https://dns.google/resolve?name=_dmarc.${domain}&type=TXT`);
      const data = await res.json();
      const mxData = await mxRes.json();
      const dmarcData = await dmarcRes.json();
      
      setResult({
        txt: data.Answer || [],
        mx: mxData.Answer || [],
        dmarc: dmarcData.Answer || [],
      });
    } catch (e) {
      setResult({ error: "No se pudo checar" });
    }
    setLoading(false);
  };

  return (
    <div style={{maxWidth: 600, margin: "40px auto", padding: 20, fontFamily: "sans-serif"}}>
      <h1>Is Your Cold Email Domain Burned?</h1>
      <p>Proyecto Qwen - Independiente de PIAT</p>
      <div style={{display: "flex", gap: 10, marginTop: 20}}>
        <input 
          value={domain}
          onChange={(e)=>setDomain(e.target.value)}
          placeholder="ej: qwen-outreach.com"
          style={{flex: 1, padding: 12, border: "1px solid #ccc", borderRadius: 8}}
        />
        <button onClick={checkDomain} style={{padding: "12px 20px", background: "black", color: "white", borderRadius: 8}}>
          {loading ? "..." : "Check"}
        </button>
      </div>
      {result && (
        <div style={{marginTop: 20, padding: 15, background: "#f5f5f5", borderRadius: 8, fontSize: 13}}>
          <p><b>MX (¿tiene correo?):</b> {result.mx.length > 0 ? "✅ SI" : "❌ NO - Dominio quemado o sin configurar"}</p>
          <p><b>SPF (TXT):</b> {result.txt.length > 0 ? "✅ SI" : "❌ NO"}</p>
          <p><b>DMARC:</b> {result.dmarc.length > 0 ? "✅ SI" : "❌ NO - Alto riesgo de spam"}</p>
          <pre style={{whiteSpace: "pre-wrap", marginTop: 10}}>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
