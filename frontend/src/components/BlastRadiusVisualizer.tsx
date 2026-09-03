import React from 'react';
import { AlertOctagon, ArrowUpRight, ShieldAlert, Zap } from 'lucide-react';

export const BlastRadiusVisualizer: React.FC = () => {
  const blastScore = 88;
  const upstreamImpact = [
    { name: 'payment-service', tier: 'tier-1', distance: 1, path: 'payment-service -> auth-service' },
    { name: 'checkout-service', tier: 'tier-1', distance: 2, path: 'checkout-service -> payment-service -> auth-service' },
  ];

  return (
    <div className="stitch-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-geist text-base font-bold text-white flex items-center gap-2">
            <AlertOctagon className="h-4 w-4 text-rose-400" />
            Graph Blast Radius Inspector (Neo4j Reachability)
          </h2>
          <p className="text-xs text-slate-400">Upstream dependent services affected by target workload failure</p>
        </div>
        <span className="label-caps bg-rose-500/10 text-rose-300 border border-rose-500/30 px-2.5 py-1 rounded">
          TARGET: auth-service
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Risk Score Gauge */}
        <div className="stitch-card p-5 flex flex-col items-center justify-center text-center bg-slate-950/80 border-rose-500/30 shadow-lg shadow-rose-500/10">
          <p className="label-caps text-slate-400 mb-3">BLAST RADIUS RISK SCORE</p>
          <div className="relative flex items-center justify-center">
            <div className="h-28 w-28 rounded-full border-4 border-rose-500/30 flex items-center justify-center bg-rose-500/10 shadow-lg shadow-rose-500/20">
              <span className="font-geist text-3xl font-extrabold text-rose-400">{blastScore}%</span>
            </div>
          </div>
          <p className="text-xs text-rose-300 font-bold mt-3 uppercase tracking-wider">CRITICAL UPSTREAM EXPOSURE</p>
          <p className="text-[11px] text-slate-400 font-mono-code mt-1">2 Tier-1 services impacted</p>
        </div>

        {/* Upstream Dependent Impact Tree */}
        <div className="md:col-span-2 space-y-3">
          <h3 className="label-caps text-slate-300 flex items-center gap-1.5 mb-2">
            <ArrowUpRight className="h-3.5 w-3.5 text-cyan-400" />
            Impacted Upstream Dependent Services ({upstreamImpact.length})
          </h3>

          {upstreamImpact.map((item, idx) => (
            <div key={idx} className="stitch-card p-3.5 flex items-center justify-between border-l-4 border-l-rose-500 bg-slate-900/60">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white font-mono-code">{item.name}</span>
                  <span className="label-caps bg-rose-500/10 text-rose-300 border border-rose-500/30 px-1.5 py-0.5 rounded text-[9px]">
                    {item.tier}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono-code mt-1.5">{item.path}</p>
              </div>
              <span className="label-caps bg-slate-800/80 text-cyan-300 px-2.5 py-1 rounded border border-slate-700">
                Distance: {item.distance}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
