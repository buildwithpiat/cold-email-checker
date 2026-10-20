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
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="max-w-3xl mx-auto px-6 py-20">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-block px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-400 mb-6">
            Free Domain Deliverability Checker
          </div>
          <h1 className="text-5xl font-bold tracking-tight mb-4">
            Is Your Cold Email Domain <span className="text-[#00D4FF]">Burned?</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-xl mx-auto">
            Check SPF, DKIM, DMARC and blacklist status in 10 seconds. Get the exact fix to copy-paste.
          </p>
        </div>

        {/* Input Form */}
        {!result && (
          <form onSubmit={handleSubmit} className="max-w-xl mx-auto">
            <div className="flex gap-2">
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="yourcompany.com"
                className="flex-1 px-5 py-4 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[#00D4FF] text-white placeholder-gray-500 text-lg"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-4 bg-[#00D4FF] text-black font-semibold rounded-lg hover:bg-[#00B8E6] transition disabled:opacity-50"
              >
                {loading ? 'Checking...' : 'Check'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-3 text-center">
              No login required. Results in ~10 seconds.
            </p>
          </form>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Score */}
            <div className="text-center py-12 border border-white/10 rounded-2xl bg-white/[0.02]">
              <div className="text-sm text-gray-400 mb-2">Deliverability Score</div>
              <div className="text-8xl font-bold tracking-tight" style={{ color: scoreColor }}>
                {result.score}
              </div>
              <div className="text-sm text-gray-500 mt-2">out of 100</div>
              <button
                onClick={() => { setResult(null); setDomain(''); }}
                className="mt-6 text-sm text-gray-400 hover:text-white underline"
              >
                Check another domain
              </button>
            </div>

            {/* Issues */}
            {result.score < 100 && (
              <div className="space-y-3">
                <h2 className="text-xl font-semibold">Issues Found</h2>

                {result.spf.status !== 'pass' && (
                  <div className="p-5 bg-white/[0.03] border border-white/10 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xl" style={{ color: result.spf.status === 'fail' ? '#FF3366' : '#FFAA00' }}>
                          {result.spf.status === 'fail' ? '✗' : '⚠'}
                        </span>
                        <div>
                          <div className="font-semibold">SPF Record {result.spf.status === 'missing' ? 'Missing' : 'Invalid'}</div>
                          <div className="text-sm text-gray-400">Emails may be marked as spam</div>
                        </div>
                      </div>
                    </div>
                    {result.spf.fix && (
                      <div className="flex items-center gap-2 bg-black/50 p-3 rounded border border-white/10">
                        <code className="flex-1 text-sm text-[#00D4FF] font-mono">{result.spf.fix}</code>
                        <button
                          onClick={() => copyToClipboard(result.spf.fix!, 'spf')}
                          className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-sm"
                        >
                          {copied === 'spf' ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {result.dkim.status !== 'pass' && (
                  <div className="p-5 bg-white/[0.03] border border-white/10 rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xl" style={{ color: '#FFAA00' }}></span>
                      <div>
                        <div className="font-semibold">DKIM Not Configured</div>
                        <div className="text-sm text-gray-400">Emails lack authentication signature</div>
                      </div>
                    </div>
                    {result.dkim.fix && (
                      <div className="flex items-center gap-2 bg-black/50 p-3 rounded border border-white/10">
                        <code className="flex-1 text-sm text-[#00D4FF] font-mono">{result.dkim.fix}</code>
                        <button
                          onClick={() => copyToClipboard(result.dkim.fix!, 'dkim')}
                          className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-sm"
                        >
                          {copied === 'dkim' ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {result.dmarc.status !== 'pass' && (
                  <div className="p-5 bg-white/[0.03] border border-white/10 rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xl" style={{ color: '#FFAA00' }}></span>
                      <div>
                        <div className="font-semibold">DMARC Record Missing</div>
                        <div className="text-sm text-gray-400">No protection against spoofing</div>
                      </div>
                    </div>
                    {result.dmarc.fix && (
                      <div className="flex items-center gap-2 bg-black/50 p-3 rounded border border-white/10">
                        <code className="flex-1 text-sm text-[#00D4FF] font-mono">{result.dmarc.fix}</code>
                        <button
                          onClick={() => copyToClipboard(result.dmarc.fix!, 'dmarc')}
                          className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-sm"
                        >
                          {copied === 'dmarc' ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {result.blacklists.status === 'fail' && (
                  <div className="p-5 bg-[#FF3366]/10 border border-[#FF3366]/30 rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xl text-[#FF3366]">✗</span>
                      <div>
                        <div className="font-semibold text-[#FF3366]">Blacklisted on {result.blacklists.count} list(s)</div>
                        <div className="text-sm text-gray-400">Your domain is blocked</div>
                      </div>
                    </div>
                    <div className="space-y-1 mt-3">
                      {result.blacklists.lists.map((list, i) => (
                        <div key={i} className="text-sm text-gray-300">• {list}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Perfect Score */}
            {result.score === 100 && (
              <div className="p-8 bg-[#00FF88]/10 border border-[#00FF88]/30 rounded-lg text-center">
                <div className="text-4xl mb-3">✓</div>
                <h3 className="text-xl font-semibold text-[#00FF88] mb-2">Perfect Configuration</h3>
                <p className="text-gray-400">Your domain is properly configured for cold email.</p>
              </div>
            )}

            {/* Email Capture */}
            {result.score < 100 && !emailSent && (
              <div className="p-6 bg-white/[0.03] border border-[#FFAA00]/30 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Get the full fix report by email</h3>
                <p className="text-sm text-gray-400 mb-4">We'll send you the exact steps to fix your domain + a free weekly monitoring trial.</p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="flex-1 px-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-[#00D4FF] text-white placeholder-gray-500"
                  />
                  <button
                    onClick={sendReport}
                    className="px-6 py-3 bg-[#00D4FF] text-black font-semibold rounded-lg hover:bg-[#00B8E6] transition"
                  >
                    Send Report
                  </button>
                </div>
              </div>
            )}

            {emailSent && (
              <div className="p-6 bg-[#00FF88]/10 border border-[#00FF88]/30 rounded-lg text-center">
                <div className="text-2xl mb-2">✓</div>
                <h3 className="font-semibold text-[#00FF88]">Report sent to {email}</h3>
                <p className="text-sm text-gray-400 mt-1">Check your inbox for the fix + monitoring offer.</p>
              </div>
            )}

            {/* Stripe CTA */}
            <div className="p-8 bg-gradient-to-br from-white/[0.05] to-transparent border border-white/10 rounded-2xl text-center">
              <h2 className="text-2xl font-bold mb-2">Never let your domain burn again</h2>
              <p className="text-gray-400 mb-6">Weekly automated checks + instant blacklist alerts</p>
              <a
                href={process.env.NEXT_PUBLIC_STRIPE_LINK || 'https://buy.stripe.com/YOUR_STRIPE_LINK'}
                className="inline-block px-8 py-4 bg-[#00D4FF] text-black font-bold rounded-lg hover:bg-[#00B8E6] transition text-lg"
              >
                Get Weekly Monitoring — $25/mo
              </a>
              <p className="text-xs text-gray-500 mt-3">Cancel anytime. 7-day free trial.</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-20 text-center text-sm text-gray-600">
          Built for cold email professionals. Check unlimited domains for free.
        </div>
      </div>
    </main>
  );
}
