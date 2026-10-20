'use client';

import { useState } from 'react';

interface CheckResult {
  spf: { status: 'pass' | 'fail' | 'missing'; value?: string; fix?: string };
  dkim: { status: 'pass' | 'fail' | 'missing'; value?: string; fix?: string };
  dmarc: { status: 'pass' | 'fail' | 'missing'; value?: string; fix?: string };
  blacklists: { status: 'pass' | 'fail'; count: number; lists: string[] };
  score: number;
}

export default function Home() {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain) return;
    setLoading(true);
    setResult(null);
    setEmailSent(false);

    try {
      const res = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domain.trim() }),
      });
      const data = await res.json();
      setResult(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const sendReport = async () => {
    if (!email || !result) return;
    try {
      await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, domain, score: result.score }),
      });
      setEmailSent(true);
    } catch (e) {
      console.error(e);
    }
  };

  const scoreColor = result
    ? result.score >= 80 ? '#00FF88' : result.score >= 60 ? '#FFAA00' : '#FF3366'
    : '#ffffff';

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: 'white', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '80px 24px' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <div style={{ display: 'inline-block', padding: '8px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '9999px', fontSize: '12px', color: '#9CA3AF', marginBottom: '24px' }}>
            Free Domain Deliverability Checker
          </div>
          <h1 style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '16px', letterSpacing: '-0.025em' }}>
            Is Your Cold Email Domain <span style={{ color: '#00D4FF' }}>Burned?</span>
          </h1>
          <p style={{ fontSize: '18px', color: '#9CA3AF', maxWidth: '560px', margin: '0 auto' }}>
            Check SPF, DKIM, DMARC and blacklist status in 10 seconds. Get the exact fix to copy-paste.
          </p>
        </div>

        {/* Input Form */}
        {!result && (
          <form onSubmit={handleSubmit} style={{ maxWidth: '512px', margin: '0 auto' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="yourcompany.com"
                style={{ flex: 1, padding: '16px 20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '18px', outline: 'none' }}
                required
              />
              <button
                type="submit"
                disabled={loading}
                style={{ padding: '16px 32px', background: '#00D4FF', color: 'black', fontWeight: '600', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '16px' }}
              >
                {loading ? 'Checking...' : 'Check'}
              </button>
            </div>
            <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '12px', textAlign: 'center' }}>
              No login required. Results in ~10 seconds.
            </p>
          </form>
        )}

        {/* Results */}
        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Score */}
            <div style={{ textAlign: 'center', padding: '48px 24px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ fontSize: '14px', color: '#9CA3AF', marginBottom: '8px' }}>Deliverability Score</div>
              <div style={{ fontSize: '96px', fontWeight: 'bold', color: scoreColor, lineHeight: 1 }}>{result.score}</div>
              <div style={{ fontSize: '14px', color: '#6B7280', marginTop: '8px' }}>out of 100</div>
              <button
                onClick={() => { setResult(null); setDomain(''); }}
                style={{ marginTop: '24px', fontSize: '14px', color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Check another domain
              </button>
            </div>

            {/* Issues */}
            {result.score < 100 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '600' }}>Issues Found</h2>

                {result.spf.status !== 'pass' && (
                  <div style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '20px', color: result.spf.status === 'fail' ? '#FF3366' : '#FFAA00' }}>
                        {result.spf.status === 'fail' ? '✗' : '⚠'}
                      </span>
                      <div>
                        <div style={{ fontWeight: '600' }}>SPF Record {result.spf.status === 'missing' ? 'Missing' : 'Invalid'}</div>
                        <div style={{ fontSize: '14px', color: '#9CA3AF' }}>Emails may be marked as spam</div>
                      </div>
                    </div>
                    {result.spf.fix && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.5)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <code style={{ flex: 1, fontSize: '14px', color: '#00D4FF', fontFamily: 'monospace' }}>{result.spf.fix}</code>
                        <button
                          onClick={() => copyToClipboard(result.spf.fix!, 'spf')}
                          style={{ padding: '4px 12px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', fontSize: '14px' }}
                        >
                          {copied === 'spf' ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {result.dkim.status !== 'pass' && (
                  <div style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '20px', color: '#FFAA00' }}></span>
                      <div>
                        <div style={{ fontWeight: '600' }}>DKIM Not Configured</div>
                        <div style={{ fontSize: '14px', color: '#9CA3AF' }}>Emails lack authentication signature</div>
                      </div>
                    </div>
                    {result.dkim.fix && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.5)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <code style={{ flex: 1, fontSize: '14px', color: '#00D4FF', fontFamily: 'monospace' }}>{result.dkim.fix}</code>
                        <button
                          onClick={() => copyToClipboard(result.dkim.fix!, 'dkim')}
                          style={{ padding: '4px 12px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', fontSize: '14px' }}
                        >
                          {copied === 'dkim' ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {result.dmarc.status !== 'pass' && (
                  <div style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '20px', color: '#FFAA00' }}>⚠</span>
                      <div>
                        <div style={{ fontWeight: '600' }}>DMARC Record Missing</div>
                        <div style={{ fontSize: '14px', color: '#9CA3AF' }}>No protection against spoofing</div>
                      </div>
                    </div>
                    {result.dmarc.fix && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.5)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <code style={{ flex: 1, fontSize: '14px', color: '#00D4FF', fontFamily: 'monospace' }}>{result.dmarc.fix}</code>
                        <button
                          onClick={() => copyToClipboard(result.dmarc.fix!, 'dmarc')}
                          style={{ padding: '4px 12px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', fontSize: '14px' }}
                        >
                          {copied === 'dmarc' ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {result.blacklists.status === 'fail' && (
                  <div style={{ padding: '20px', background: 'rgba(255,51,102,0.1)', border: '1px solid rgba(255,51,102,0.3)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '20px', color: '#FF3366' }}>✗</span>
                      <div>
                        <div style={{ fontWeight: '600', color: '#FF3366' }}>Blacklisted on {result.blacklists.count} list(s)</div>
                        <div style={{ fontSize: '14px', color: '#9CA3AF' }}>Your domain is blocked</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '12px' }}>
                      {result.blacklists.lists.map((list, i) => (
                        <div key={i} style={{ fontSize: '14px', color: '#D1D5DB' }}>• {list}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Perfect Score */}
            {result.score === 100 && (
              <div style={{ padding: '32px', background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>✓</div>
                <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#00FF88', marginBottom: '8px' }}>Perfect Configuration</h3>
                <p style={{ color: '#9CA3AF' }}>Your domain is properly configured for cold email.</p>
              </div>
            )}

            {/* Email Capture */}
            {result.score < 100 && !emailSent && (
              <div style={{ padding: '24px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,170,0,0.3)', borderRadius: '8px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Get the full fix report by email</h3>
                <p style={{ fontSize: '14px', color: '#9CA3AF', marginBottom: '16px' }}>We'll send you the exact steps to fix your domain + a free weekly monitoring trial.</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    style={{ flex: 1, padding: '12px 16px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '14px', outline: 'none' }}
                  />
                  <button
                    onClick={sendReport}
                    style={{ padding: '12px 24px', background: '#00D4FF', color: 'black', fontWeight: '600', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                  >
                    Send Report
                  </button>
                </div>
              </div>
            )}

            {emailSent && (
              <div style={{ padding: '24px', background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>✓</div>
                <h3 style={{ fontWeight: '600', color: '#00FF88' }}>Report sent to {email}</h3>
                <p style={{ fontSize: '14px', color: '#9CA3AF', marginTop: '4px' }}>Check your inbox for the fix + monitoring offer.</p>
              </div>
            )}

            {/* Stripe CTA */}
            <div style={{ padding: '32px', background: 'linear-gradient(135deg, rgba(255,255,255,0.05), transparent)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', textAlign: 'center' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Never let your domain burn again</h2>
              <p style={{ color: '#9CA3AF', marginBottom: '24px' }}>Weekly automated checks + instant blacklist alerts</p>
              <a
                href={process.env.NEXT_PUBLIC_STRIPE_LINK || 'https://buy.stripe.com/YOUR_STRIPE_LINK'}
                style={{ display: 'inline-block', padding: '16px 32px', background: '#00D4FF', color: 'black', fontWeight: 'bold', borderRadius: '8px', textDecoration: 'none', fontSize: '18px' }}
              >
                Get Weekly Monitoring — $25/mo
              </a>
              <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '12px' }}>Cancel anytime. 7-day free trial.</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: '80px', textAlign: 'center', fontSize: '14px', color: '#4B5563' }}>
          Built for cold email professionals. Check unlimited domains for free.
        </div>
      </div>
    </div>
  );
}
