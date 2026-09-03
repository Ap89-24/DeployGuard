import React from 'react';
import { 
  Shield, 
  LayoutDashboard, 
  Cpu, 
  AlertTriangle, 
  Database, 
  GitMerge, 
  Plug, 
  UserCheck, 
  Settings, 
  ChevronDown, 
  Building2, 
  Layers,
  Activity
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingApprovalsCount: number;
  activeIncidentsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  pendingApprovalsCount,
  activeIncidentsCount,
}) => {
  const navItems = [
    { id: 'overview', label: 'Mission Control', icon: LayoutDashboard },
    { id: 'topology', label: 'Topology Graph', icon: Cpu },
    { id: 'blast-radius', label: 'Blast Radius Engine', icon: Layers },
    { id: 'vector-memory', label: '768d Vector Store', icon: Database },
    { id: 'workflow', label: 'LangGraph Pipeline', icon: GitMerge },
    { id: 'incidents', label: 'Incidents & RCA', icon: AlertTriangle, badge: activeIncidentsCount > 0 ? `${activeIncidentsCount}` : null, badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
    { id: 'integrations', label: 'DevOps Connectors', icon: Plug },
    { id: 'approvals', label: 'SRE Approvals', icon: UserCheck, badge: pendingApprovalsCount > 0 ? `${pendingApprovalsCount}` : null, badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    { id: 'settings', label: 'Organization & Policy', icon: Settings },
  ];

  return (
    <aside className="w-64 shrink-0 bg-slate-950/95 border-r border-slate-800/80 flex flex-col justify-between h-screen sticky top-0 z-40 backdrop-blur-xl">
      <div>
        {/* Brand Logo & Tenant Switcher */}
        <div className="p-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 p-0.5 shadow-lg shadow-cyan-500/20">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-slate-950">
                <Shield className="h-5 w-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <h1 className="font-geist text-base font-extrabold text-white tracking-tight">DeployGuard AI</h1>
              <p className="text-[10px] text-cyan-400 font-mono tracking-wider uppercase">Enterprise SaaS v1.0</p>
            </div>
          </div>

          {/* Tenant Selector Pill */}
          <div className="flex items-center justify-between rounded-lg bg-slate-900/90 px-3 py-2 border border-slate-800/90 text-xs cursor-pointer hover:border-slate-700 transition-all">
            <div className="flex items-center gap-2 text-slate-300 truncate">
              <Building2 className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
              <span className="font-medium truncate">Acme Corp (Production)</span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="p-3 space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
            Platform Control
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/15 to-indigo-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                    : 'text-slate-400 hover:bg-slate-900/80 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border font-mono ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Profile Card Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/40">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-900/80 border border-slate-800/80">
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-md">
            AS
          </div>
          <div className="truncate">
            <p className="text-xs font-bold text-white truncate">Alice Smith</p>
            <p className="text-[10px] text-slate-400 truncate font-mono">sre-lead@acme.com</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
