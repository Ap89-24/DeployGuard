import React from 'react';
import { AlertTriangle, Clock, GitCommit, Activity, FileText, CheckCircle2, ShieldAlert } from 'lucide-react';

export const IncidentsPage: React.FC = () => {
  const evidenceEvents = [
    { time: '12:00:00Z', type: 'deployment', title: 'Argo Canary Release v2.5.0 Initiated', detail: 'Canary weight set to 15% on auth-service', severity: 'info' },
    { time: '12:00:25Z', type: 'metric', title: 'HTTP 500 Error Rate Spike Detected', detail: 'Prometheus metric error rate increased from 0.01% to 18.4%', severity: 'warning' },
    { time: '12:00:27Z', type: 'log', title: 'Loki Log Exception Extracted', detail: 'NullPointerException in ES512 JWT verification algorithm', severity: 'critical' },
    { time: '12:00:29Z', type: 'k8s_event', title: 'Pod Restart Event', detail: 'Kubernetes auth-service-v2.5.0-pod-x92 restarted 3 times', severity: 'error' },
  ];

  return (
    <div className="space-y-6">
      {/* Active Incident Header */}
      <div className="stitch-card p-6 border-l-4 border-l-rose-500 bg-slate-900/60">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="label-caps bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2.5 py-1 rounded flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                CRITICAL INCIDENT #inc-2026-903-01
              </span>
              <span className="text-xs text-slate-400 font-mono">2026-09-03 12:00:27 UTC</span>
            </div>
            <h2 className="font-geist text-lg font-extrabold text-white mt-2">
              OAuth2 ES512 JWT Key Verification NullPointer in auth-service Canary Release
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Spike in 500 Internal Server Errors on auth-service canary release v2.5.0 cascading into payment authorization failures across checkout workflows.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <p className="text-[10px] text-slate-400 label-caps">RCA CONFIDENCE</p>
              <p className="text-xl font-bold text-emerald-400 font-mono">94.2%</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 label-caps">RECOMMENDED ACTION</p>
              <span className="label-caps bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2.5 py-1 rounded inline-block mt-0.5">
                ROLLBACK TO v2.4.1
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Chronological Evidence Timeline */}
      <div className="stitch-card p-6">
        <h3 className="font-geist text-base font-bold text-white mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4 text-cyan-400" />
          Chronological Evidence Event Timeline (Evidence Normalizer)
        </h3>

        <div className="relative border-l-2 border-slate-800 ml-4 space-y-6 pl-6">
          {evidenceEvents.map((ev, idx) => (
            <div key={idx} className="relative">
              <div className={`absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-slate-950 ${
                ev.severity === 'critical' ? 'bg-rose-500 ring-4 ring-rose-500/20' :
                ev.severity === 'warning' ? 'bg-amber-400' : 'bg-cyan-400'
              }`} />
              <div className="stitch-card p-3.5 bg-slate-900/60 border-slate-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white font-mono">{ev.title}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{ev.time}</span>
                </div>
                <p className="text-xs text-slate-300 font-mono">{ev.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
