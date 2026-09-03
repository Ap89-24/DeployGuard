import React from 'react';
import { Server, Activity, AlertTriangle, CheckCircle2, ChevronRight, X, Code2, Layers, Cpu } from 'lucide-react';

interface KubernetesEventModalProps {
  event: any | null;
  onClose: () => void;
}

export const KubernetesEventModal: React.FC<KubernetesEventModalProps> = ({ event, onClose }) => {
  if (!event) return null;

  const payload = event.payload || {};
  const isDeployment = event.type === 'KUBERNETES_DEPLOYMENT_CHANGE';
  const isPodRestart = event.type === 'KUBERNETES_POD_RESTART';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4">
      <div className="stitch-card w-full max-w-2xl p-6 border-cyan-500/40 shadow-2xl shadow-cyan-500/20 bg-slate-950/95 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-cyan-400">{event.type}</span>
                <span className={`label-caps text-[9px] px-2 py-0.5 rounded border ${
                  payload.status === 'HEALTHY'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : payload.status === 'ROLLING_OUT'
                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                    : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                }`}>
                  {payload.status || 'EVENT_OBSERVED'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Resource: <span className="text-white font-bold">{event.serviceId || payload.podName || 'Kubernetes Workload'}</span>
                {' · '}Namespace: <span className="text-slate-300">{payload.namespace || 'default'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900 transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Change Summary Box */}
        <div className="stitch-card p-4 mb-5 bg-slate-900/80 border-slate-800 border-l-4 border-l-cyan-500">
          <p className="label-caps text-slate-400 mb-1">Observed Cluster Change Summary</p>
          <p className="text-sm font-bold text-white font-mono leading-relaxed">
            {payload.message || (isDeployment ? `Kubernetes Deployment '${event.serviceId}' replica scale or status update.` : `Kubernetes Pod restarted.`)}
          </p>
          <p className="text-xs text-slate-400 font-mono mt-2 flex items-center gap-2">
            <span>Logged at: {new Date(event.timestamp).toLocaleString()}</span>
            <span>·</span>
            <span>Provider: {event.provider}</span>
          </p>
        </div>

        {/* Spec & Status Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div className="stitch-card p-3 bg-slate-900/60 border-slate-800">
            <p className="label-caps text-slate-400 text-[10px]">Desired Replicas</p>
            <p className="text-lg font-bold text-white font-mono mt-0.5">{payload.desiredReplicas ?? 'N/A'}</p>
          </div>
          <div className="stitch-card p-3 bg-slate-900/60 border-slate-800">
            <p className="label-caps text-slate-400 text-[10px]">Ready Replicas</p>
            <p className="text-lg font-bold text-emerald-400 font-mono mt-0.5">{payload.readyReplicas ?? 'N/A'}</p>
          </div>
          <div className="stitch-card p-3 bg-slate-900/60 border-slate-800">
            <p className="label-caps text-slate-400 text-[10px]">Available Replicas</p>
            <p className="text-lg font-bold text-cyan-300 font-mono mt-0.5">{payload.availableReplicas ?? 'N/A'}</p>
          </div>
          <div className="stitch-card p-3 bg-slate-900/60 border-slate-800">
            <p className="label-caps text-slate-400 text-[10px]">Version / Revision</p>
            <p className="text-xs font-bold text-purple-300 font-mono mt-1 truncate">{payload.version || 'v1.0.0'}</p>
          </div>
        </div>

        {/* Raw Event JSON Readout */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="label-caps text-slate-300 flex items-center gap-1.5">
              <Code2 className="h-3.5 w-3.5 text-cyan-400" />
              Raw Kubernetes Event Payload (JSON)
            </span>
          </div>
          <pre className="stitch-card p-3.5 bg-slate-950 text-cyan-300 text-xs font-mono overflow-x-auto max-h-48 rounded-lg border border-slate-800 leading-relaxed">
            {JSON.stringify(event, null, 2)}
          </pre>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white border border-slate-800 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
