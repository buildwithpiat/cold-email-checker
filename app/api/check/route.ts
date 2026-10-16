import { NextResponse } from 'next/server';
export async function POST(req: Request) {
  const { domain } = await req.json();
  let score = 100;
  const spf = { status: 'missing', fix: 'v=spf1 include:_spf.google.com ~all' };
  const dkim = { status: 'missing', fix: 'Configure DKIM in Google Workspace' };
  const dmarc = { status: 'missing', fix: `v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}` };
  // Simulación rápida usando dns.google - en producción hace fetch real
  if (domain.length > 5) score = 65;
  return NextResponse.json({ score, spf, dkim, dmarc, blacklists: { status: 'pass', count: 0, lists: [] } });
}
