"use client";
import { useState } from "react";

export default function Home() {
  const [domain, setDomain] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const check = async () => {
    setLoading(true);
    const res = await fetch("/api/check", { method: "POST", body: JSON.stringify({ domain }), headers: {"Content-Type":"application/json"} });
    const data = await res.json();
    setResult(data);
    setLoading(false);
  };

  return (
    <div style={{maxWidth:650, margin:"40px auto", padding:20, fontFamily:"sans-serif"}}>
      <h1 style={{fontSize:28, fontWeight:700}}>Is Your Cold Email Domain Burned?</h1>
      <p>Proyecto Qwen independiente de PIAT - con piat2072@gmail.com</p>
      
      <div style={{display:"flex", gap:10, marginTop:20}}>
        <input value={domain} onChange={e=>setDomain(e.target.value)} placeholder="ej: google.com" style={{flex:1, padding:12, border:"1px solid #ccc", borderRadius:8}} />
        <button onClick={check} style={{padding:"12px 20px", background:"black", color:"white", borderRadius:8}}>{loading ? "..." : "Check"}</button>
      </div>

      {result && (
        <div style={{marginTop:20, padding:20, background: result.isBurned ? "#fee" : "#efe", borderRadius:12}}>
          <h2>{result.verdict}</h2>
          <p>Score: {result.score}/100</p>
          <p>MX: {result.details.hasMX ? "✅" : "❌"} | SPF: {result.details.hasSPF ? "✅" : "❌"} | DMARC: {result.details.hasDMARC ? "✅" : "❌"}</p>
          <p style={{marginTop:15, fontSize:12}}>Si está verde, ya puedes usar /api/send-qwen para mandar con Qwen usando piat2072@gmail.com</p>
        </div>
      )}
    </div>
  );
}
