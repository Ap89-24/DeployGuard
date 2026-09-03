import React from 'react';
import { GitBranch, Server, Activity, ShieldCheck, Check, Plus, ExternalLink } from 'lucide-react';

export const IntegrationsPage: React.FC = () => {
  const integrations = [
    { id: 'github', name: 'GitHub App', status: 'Connected', icon: GitBranch, detail: 'Acme/auth-service (HMAC Webhooks Verified)' },
    { id: 'k8s', name: 'Kubernetes API', status: 'Connected', icon: Server, detail: 'eks-prod-us-east-1 (ServiceAccount RBAC)' },
    { id: 'argo', name: 'Argo Rollouts', status: 'Connected', icon: ShieldCheck, detail: 'CRD Controller client active' },
    { id: 'prometheus', name: 'Prometheus', status: 'Connected', icon: Activity, detail: 'http://prometheus.prod:9090 (PromQL query API)' },
    { id: 'loki', name: 'Loki Logs', status: 'Connected', icon: Activity, detail: 'http://loki.prod:3100 (LogQL exception extraction)' },
    { id: 'slack', name: 'Slack Notifications', status: 'Not Connected', icon: ExternalLink, detail: 'OAuth notification channel' },
  ];

  return (
    <div className="stitch-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-geist text-base font-bold text-white">DevOps & Infrastructure Integrations</h2>
          <p className="text-xs text-slate-400">Connect real GitHub repositories, K8s clusters, and telemetry stacks</p>
        </div>
        <button className="btn-cyan-glow flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider">
          <Plus className="h-3.5 w-3.5" />
          Connect Integration
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((item) => {
          const Icon = item.icon;
          const isConnected = item.status === 'Connected';
          return (
            <div key={item.id} className="stitch-card p-4 flex flex-col justify-between bg-slate-900/60 border-slate-800">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-cyan-400">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold text-white font-mono-code">{item.name}</span>
                  </div>
                  <span className={`label-caps text-[9px] px-2 py-0.5 rounded flex items-center gap-1 ${
                    isConnected
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {isConnected && <Check className="h-3 w-3" />}
                    {item.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono-code">{item.detail}</p>
              </div>

              <div className="mt-4 border-t border-slate-800/80 pt-2 flex justify-end">
                <button className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 font-mono-code">
                  Configure Settings &rarr;
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
