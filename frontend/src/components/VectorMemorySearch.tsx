import React, { useState } from 'react';
import { Database, Search, Sparkles, CheckCircle2 } from 'lucide-react';

export const VectorMemorySearch: React.FC = () => {
  const [query, setQuery] = useState('JWT RSA key signature null pointer crash');
  const [isSearching, setIsSearching] = useState(false);

  const mockResults = [
    {
      id: 'inc-hist-001',
      title: 'OAuth2 RSA Key Signature Verification Failure in auth-service',
      similarity: 0.942,
      summary: 'Null pointer exception during JWT validation algorithm swap causing 500 error spike',
      resolution: 'Rollback to v2.4.1 and patch secret environment injection.',
    },
    {
      id: 'inc-hist-004',
      title: 'Token Payload Parsing NullPointer in API Gateway',
      similarity: 0.815,
      summary: 'Missing header challenge payload in OAuth token validation',
      resolution: 'Hotfix patch deployed with fallback default RSA key.',
    },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setTimeout(() => setIsSearching(false), 400);
  };

  return (
    <div className="stitch-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-geist text-base font-bold text-white flex items-center gap-2">
            <Database className="h-4 w-4 text-cyan-400" />
            Neo4j 768-Dimensional Vector Store (Cosine Index)
          </h2>
          <p className="text-xs text-slate-400">Semantic similarity search across historical incident operational memory</p>
        </div>
        <span className="label-caps bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 px-2.5 py-1 rounded">
          768 FLOAT DIMS | COSINE DISTANCE
        </span>
      </div>

      {/* Query Bar */}
      <form onSubmit={handleSearch} className="mb-6 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Query incident vector memory..."
            className="w-full rounded-lg bg-slate-950/90 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 border border-slate-800 focus:border-cyan-400 focus:outline-none font-mono-code"
          />
        </div>
        <button
          type="submit"
          disabled={isSearching}
          className="btn-cyan-glow flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold uppercase tracking-wider disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4" />
          Search Memory
        </button>
      </form>

      {/* Results */}
      <div className="space-y-4">
        {mockResults.map((item) => (
          <div key={item.id} className="stitch-card p-4 bg-slate-900/60 border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white font-mono-code">{item.title}</span>
                <span className="label-caps text-slate-400">({item.id})</span>
              </div>
              <span className="label-caps bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded">
                {(item.similarity * 100).toFixed(1)}% Match
              </span>
            </div>
            <p className="text-xs text-slate-300 mb-2.5">{item.summary}</p>
            <div className="flex items-center gap-2 text-[11px] text-cyan-300 bg-cyan-500/10 p-2.5 rounded border border-cyan-500/20 font-mono-code">
              <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
              <span>Historical Resolution: {item.resolution}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
