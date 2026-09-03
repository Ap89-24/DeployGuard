import React from 'react';
import { Shield, Server, Activity, CheckCircle2, Play, Sparkles, Terminal } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onTriggerSimulation: () => void;
  isSimulating: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onTriggerSimulation,
  isSimulating,
}) => {
  const tabs = [
    { id: 'overview', label: 'Mission Control' },
    { id: 'topology', label: 'Topology Graph' },
    { id: 'blast-radius', label: 'Blast Radius' },
    { id: 'vector-memory', label: '768d Vector Store' },
    { id: 'workflow', label: 'LangGraph Pipeline' },
    { id: 'integrations', label: 'DevOps Connectors' },
  ];

  return (
    <header className="stitch-card sticky top-0 z-50 mb-6 border-b border-cyan-500/20 px-6 py-4 bg-slate-950/90 backdrop-blur-md">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Brand & HUD Title */}
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 p-0.5 shadow-lg shadow-cyan-500/20">
            <div className="flex h-full w-full items-center justify-center rounded-[6px] bg-slate-950">
              <Shield className="h-6 w-6 text-cyan-400 shrink-0" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-geist text-xl font-extrabold tracking-tight text-white">DeployGuard AI</h1>
              <span className="label-caps bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 px-2.5 py-0.5 rounded">
                CYBER-ORCHESTRATOR SaaS
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5 font-mono-code">
              <Terminal className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
              Kubernetes Progressive Safety & Autonomous Recovery Engine
            </p>
          </div>
        </div>

        {/* Live Cluster HUD Indicators & Simulation Button */}
        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-3 rounded-md bg-slate-900/90 px-3.5 py-1.5 border border-slate-800 text-xs font-mono-code md:flex">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Server className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
              <span>cluster: eks-prod-us-east-1</span>
            </div>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-1.5 text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <span>Argo Controller Connected</span>
            </div>
          </div>

          <button
            onClick={onTriggerSimulation}
            disabled={isSimulating}
            className="btn-purple-ai flex items-center gap-2 rounded-lg px-4 py-2 text-xs uppercase tracking-wider font-bold disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className={`h-4 w-4 shrink-0 ${isSimulating ? 'animate-spin' : ''}`} />
            {isSimulating ? 'SIMULATING WORKFLOW...' : 'TRIGGER INCIDENT SIMULATION'}
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="mt-4 flex gap-1.5 border-t border-slate-800/80 pt-3 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`label-caps rounded-md px-3.5 py-1.5 transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-400/40 shadow-sm shadow-cyan-500/20'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </header>
  );
};
