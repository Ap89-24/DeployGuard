import React, { useState } from 'react';
import { Cpu, Zap, Activity, AlertTriangle, Layers } from 'lucide-react';

export interface ServiceNode {
  id: string;
  name: string;
  tier: 'tier-1' | 'tier-2' | 'tier-3';
  status: 'HEALTHY' | 'DEGRADED' | 'OUTAGE';
  x: number;
  y: number;
  dependsOn: string[];
}

export const TopologyGraph: React.FC = () => {
  const [selectedNode, setSelectedNode] = useState<string>('svc-auth');

  const nodes: ServiceNode[] = [
    { id: 'svc-checkout', name: 'checkout-service', tier: 'tier-1', status: 'HEALTHY', x: 140, y: 150, dependsOn: ['svc-payment', 'svc-inventory'] },
    { id: 'svc-payment', name: 'payment-service', tier: 'tier-1', status: 'HEALTHY', x: 400, y: 150, dependsOn: ['svc-auth'] },
    { id: 'svc-inventory', name: 'inventory-service', tier: 'tier-2', status: 'HEALTHY', x: 400, y: 320, dependsOn: [] },
    { id: 'svc-auth', name: 'auth-service', tier: 'tier-1', status: 'DEGRADED', x: 670, y: 150, dependsOn: [] },
  ];

  const activeNode = nodes.find(n => n.id === selectedNode);

  return (
    <div className="stitch-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-geist text-base font-bold text-white flex items-center gap-2">
            <Cpu className="h-4 w-4 text-cyan-400" />
            Cyber-Orchestrator Topology Graph (Neo4j Graph Memory)
          </h2>
          <p className="text-xs text-slate-400">Interactive microservices reachability map with DEPENDS_ON relationship vectors</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="label-caps bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-2.5 py-1 rounded">
            4 NODES | 3 GRAPH EDGES
          </span>
        </div>
      </div>

      <div className="relative h-96 w-full rounded-xl bg-slate-950/90 border border-slate-800/80 overflow-hidden shadow-inner">
        {/* SVG Directed Edges */}
        <svg className="absolute inset-0 h-full w-full pointer-events-none">
          <defs>
            <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0.8" />
            </linearGradient>
            <marker id="arrow" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#06b6d4" />
            </marker>
          </defs>
          {nodes.map(node =>
            node.dependsOn.map(targetId => {
              const targetNode = nodes.find(n => n.id === targetId);
              if (!targetNode) return null;
              return (
                <line
                  key={`${node.id}-${targetId}`}
                  x1={node.x}
                  y1={node.y}
                  x2={targetNode.x}
                  y2={targetNode.y}
                  stroke="url(#edgeGradient)"
                  strokeWidth="2.5"
                  strokeDasharray="6 4"
                  markerEnd="url(#arrow)"
                />
              );
            })
          )}
        </svg>

        {/* Node Components */}
        {nodes.map(node => {
          const isSelected = selectedNode === node.id;
          const isDegraded = node.status === 'DEGRADED';
          return (
            <div
              key={node.id}
              onClick={() => setSelectedNode(node.id)}
              style={{ left: `${node.x - 75}px`, top: `${node.y - 40}px` }}
              className={`absolute cursor-pointer rounded-xl p-3.5 w-44 stitch-card transition-all ${
                isSelected
                  ? 'border-cyan-400 shadow-xl shadow-cyan-500/25 ring-2 ring-cyan-500/40 bg-slate-900/90'
                  : 'hover:border-slate-600 bg-slate-900/70'
              } ${isDegraded ? 'border-rose-500/60 shadow-lg shadow-rose-500/20' : ''}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`label-caps px-1.5 py-0.5 rounded text-[9px] ${
                  node.tier === 'tier-1'
                    ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                    : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                }`}>
                  {node.tier}
                </span>
                <span className={`h-2.5 w-2.5 rounded-full ${
                  node.status === 'HEALTHY' ? 'bg-emerald-400 shadow-sm shadow-emerald-500' : 'bg-rose-500 animate-ping'
                }`} />
              </div>
              <p className="text-xs font-bold text-white font-mono-code truncate">{node.name}</p>
              <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-mono-code">
                <Layers className="h-3 w-3 text-cyan-400" />
                {node.dependsOn.length > 0 ? `${node.dependsOn.length} dep(s)` : 'leaf service'}
              </p>
            </div>
          );
        })}
      </div>

      {activeNode && (
        <div className="mt-4 stitch-card p-3.5 bg-slate-900/60 flex items-center justify-between border border-slate-800">
          <div className="flex items-center gap-3">
            <Zap className="h-4 w-4 text-cyan-400" />
            <div>
              <p className="text-xs font-bold text-white font-mono-code">Selected Node: {activeNode.name}</p>
              <p className="text-[11px] text-slate-400">Tier: {activeNode.tier.toUpperCase()} | Status: {activeNode.status}</p>
            </div>
          </div>
          <span className="label-caps bg-purple-500/10 text-purple-300 border border-purple-500/30 px-2.5 py-1 rounded">
            INSPECT GRAPH REACHABILITY
          </span>
        </div>
      )}
    </div>
  );
};
