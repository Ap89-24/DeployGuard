import React from 'react';
import { Search, Sparkles, Server, CheckCircle2, Bell, Command } from 'lucide-react';

interface TopNavProps {
  onTriggerSimulation: () => void;
  isSimulating: boolean;
}

export const TopNav: React.FC<TopNavProps> = ({ onTriggerSimulation, isSimulating }) => {
  return (
    <header className="h-16 bg-slate-950/80 border-b border-slate-800/80 px-6 flex items-center justify-between sticky top-0 z-30 backdrop-blur-xl">
      {/* Global Command Search */}
      <div className="flex items-center gap-3 w-96">
        <div className="relative w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search services, deployments, incidents, 768d vectors... (Cmd + K)"
            className="w-full bg-slate-900/90 rounded-lg pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 border border-slate-800/90 focus:border-cyan-500 focus:outline-none font-mono"
          />
          <span className="absolute right-2.5 top-2.5 text-[10px] font-mono text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
            ⌘K
          </span>
        </div>
      </div>

      {/* Cluster Status Pills & Actions */}
      <div className="flex items-center gap-4">
        <div className="hidden lg:flex items-center gap-3 bg-slate-900/80 px-3.5 py-1.5 rounded-lg border border-slate-800 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Server className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
            <span>eks-prod-us-east-1</span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span>Argo Controller Synced</span>
          </div>
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-rose-500" />
        </button>

        {/* Simulation CTA */}
        <button
          onClick={onTriggerSimulation}
          disabled={isSimulating}
          className="btn-purple-ai flex items-center gap-2 rounded-lg px-4 py-2 text-xs uppercase tracking-wider font-bold cursor-pointer disabled:opacity-50"
        >
          <Sparkles className={`h-4 w-4 shrink-0 ${isSimulating ? 'animate-spin' : ''}`} />
          {isSimulating ? 'SIMULATING WORKFLOW...' : 'SIMULATE INCIDENT'}
        </button>
      </div>
    </header>
  );
};
