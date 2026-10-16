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
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, email }),
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-error';
  };

  const getStatusIcon = (status: string) => {
    if (status === 'pass') return '✓';
    if (status === 'fail') return '✗';
    return '⚠';
  };

  const getStatusColor = (status: string) => {
    if (status === 'pass') return 'text-success';
    if (status === 'fail') return 'text-error';
    return 'text-warning';
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
            Is Your Cold Email Domain Burned?
          </h1>
          <p className="text-xl text-gray-400">
            Free deliverability checker. Get your score in 10 seconds.
          </p>
        </div>

        {/* Input Form */}
        {!result && (
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto mb-12">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Domain
                </label>
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="yourcompany.com"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg focus:outline-none focus:border-primary text-white placeholder-gray-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email (optional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@yourcompany.com"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg focus:outline-none focus:border-primary text-white placeholder-gray-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 bg-primary text-black font-semibold rounded-lg hover:bg-opacity-90 transition disabled:opacity-50"
              >
                {loading ? 'Checking...' : 'Check My Domain'}
              </button>
            </div>
          </form>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-8">
            {/* Score */}
            <div className="text-center">
              <div className={`text-8xl font-bold mb-2 ${getScoreColor(result.score)}`}>
                {result.score}
              </div>
              <div className="text-xl text-gray-400">Deliverability Score</div>
            </div>

            {/* Issues */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold mb-4">Issues Found</h2>
              
              {/* SPF */}
              {result.spf.status !== 'pass' && (
                <div className="p-6 bg-gray-900 border border-gray-800 rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className={`text-2xl ${getStatusColor(result.spf.status)}`}>
                        {getStatusIcon(result.spf.status)}
                      </span>
                      <div>
                        <h3 className="text-lg font-semibold">SPF Record Missing</h3>
                        <p className="text-sm text-gray-400">
                          Without SPF, your emails may be marked as spam
                        </p>
                      </div>
                    </div>
                  </div>
                  {result.spf.fix && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between bg-black p-3 rounded border border-gray-800">
                        <code className="text-sm text-primary">{result.spf.fix}</code>
                        <button
                          onClick={() => copyToClipboard(result.spf.fix!, 'spf')}
                          className="ml-4 px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-sm"
                        >
                          {copied === 'spf' ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Add this TXT record to your DNS settings
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* DKIM */}
              {result.dkim.status !== 'pass' && (
                <div className="p-6 bg-gray-900 border border-gray-800 rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className={`text-2xl ${getStatusColor(result.dkim.status)}`}>
                        {getStatusIcon(result.dkim.status)}
                      </span>
                      <div>
                        <h3 className="text-lg font-semibold">DKIM Not Configured</h3>
                        <p className="text-sm text-gray-400">
                          DKIM verifies your emails are authentic
                        </p>
                      </div>
                    </div>
                  </div>
                  {result.dkim.fix && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between bg-black p-3 rounded border border-gray-800">
                        <code className="text-sm text-primary">{result.dkim.fix}</code>
                        <button
                          onClick={() => copyToClipboard(result.dkim.fix!, 'dkim')}
                          className="ml-4 px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-sm"
                        >
                          {copied === 'dkim' ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Configure DKIM in your email provider dashboard
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* DMARC */}
              {result.dmarc.status !== 'pass' && (
                <div className="p-6 bg-gray-900 border border-gray-800 rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className={`text-2xl ${getStatusColor(result.dmarc.status)}`}>
                        {getStatusIcon(result.dmarc.status)}
                      </span>
                      <div>
                        <h3 className="text-lg font-semibold">DMARC Record Missing</h3>
                        <p className="text-sm text-gray-400">
                          DMARC protects against email spoofing
                        </p>
                      </div>
                    </div>
                  </div>
                  {result.dmarc.fix && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between bg-black p-3 rounded border border-gray-800">
                        <code className="text-sm text-primary">{result.dmarc.fix}</code>
                        <button
                          onClick={() => copyToClipboard(result.dmarc.fix!, 'dmarc')}
                          className="ml-4 px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-sm"
                        >
                          {copied === 'dmarc' ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Add this TXT record to your DNS settings
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Blacklists */}
              {result.blacklists.status === 'fail' && (
                <div className="p-6 bg-gray-900 border border-error rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl text-error">✗</span>
                      <div>
                        <h3 className="text-lg font-semibold text-error">
                          Blacklisted on {result.blacklists.count} Lists
                        </h3>
                        <p className="text-sm text-gray-400">
                          Your domain is blocked by email providers
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    {result.blacklists.lists.map((list, idx) => (
                      <div key={idx} className="text-sm text-gray-300">
                        • {list}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-4">
                    Contact each blacklist to request removal
                  </p>
                </div>
              )}

              {/* Success Message */}
              {result.score === 100 && (
                <div className="p-6 bg-gray-900 border border-success rounded-lg text-center">
                  <span className="text-4xl mb-3 block">✓</span>
                  <h3 className="text-xl font-semibold text-success mb-2">
                    Perfect Score!
                  </h3>
                  <p className="text-gray-400">
                    Your domain is properly configured for cold email
                  </p>
                </div>
              )}
            </div>

            {/* CTA */}
            <div className="mt-12 p-8 bg-gradient-to-r from-gray-900 to-black border border-gray-800 rounded-lg text-center">
              <h2 className="text-3xl font-bold mb-4">
                Get Weekly Health Reports
              </h2>
              <p className="text-gray-400 mb-6">
                Automatic monitoring + instant alerts if your domain gets blacklisted
              </p>
              <a
                href="https://buy.stripe.com/YOUR_STRIPE_LINK"
                className="inline-block px-8 py-4 bg-primary text-black font-semibold rounded-lg hover:bg-opacity-90 transition"
              >
                Subscribe for $25/mo
              </a>
              <p className="text-sm text-gray-500 mt-4">
                Cancel anytime. 7-day free trial.
              </p>
            </div>

            {/* Check Again */}
            <button
              onClick={() => {
                setResult(null);
                setDomain('');
                setEmail('');
              }}
              className="w-full px-6 py-3 border border-gray-800 text-gray-300 rounded-lg hover:bg-gray-900 transition"
            >
              Check Another Domain
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-16 text-center text-sm text-gray-500">
          <p>Built for cold email professionals. Check unlimited domains for free.</p>
        </div>
      </div>
    </main>
  );
}
