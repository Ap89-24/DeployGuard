import React from 'react';
import { GitMerge, CheckCircle2, Clock, Play } from 'lucide-react';

export const LangGraphWorkflowTrace: React.FC = () => {
  const steps = [
    { id: 1, name: 'ingestIncident', status: 'completed', desc: 'Saved Incident node & 768d vector embedding in Neo4j' },
    { id: 2, name: 'collectEvidence', status: 'completed', desc: 'Ingested signals from GitHub, K8s, Prometheus, Loki' },
    { id: 3, name: 'buildTimeline', status: 'completed', desc: 'Created chronological evidence event timeline' },
    { id: 4, name: 'computeBlastRadius', status: 'completed', desc: 'Traversed DEPENDS_ON reachability graph (Score: 88%)' },
    { id: 5, name: 'calculateRisk', status: 'completed', desc: 'Computed deterministic weighted risk score (92/100)' },
    { id: 6, name: 'searchSimilarIncidents', status: 'completed', desc: 'Neo4j 768d vector search matched inc-hist-001 (94.2%)' },
    { id: 7, name: 'evaluateRollbackSafety', status: 'completed', desc: 'Rollback safety engine checks passed (Score: 95/100)' },
    { id: 8, name: 'AIInvestigation', status: 'completed', desc: 'RCA Hypothesis: Incompatible ES512 JWT verification key' },
    { id: 9, name: 'policyValidation', status: 'completed', desc: 'Policy Engine validated safety guardrails' },
    { id: 10, name: 'createDecision', status: 'completed', desc: 'Recorded ROLLBACK decision node in Neo4j' },
    { id: 11, name: 'humanApproval', status: 'pending', desc: 'Waiting for SRE Lead approval signature' },
    { id: 12, name: 'revalidateState', status: 'upcoming', desc: 'Stale Decision Protection cluster state check' },
    { id: 13, name: 'executeRecovery', status: 'upcoming', desc: 'Argo Rollouts adapter rollback operation' },
    { id: 14, name: 'verifyRecovery', status: 'upcoming', desc: 'Post-action Prometheus telemetry health check' },
    { id: 15, name: 'closeIncident', status: 'upcoming', desc: 'Update Incident status to RESOLVED' },
  ];

  return (
    <div className="stitch-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-geist text-base font-bold text-white flex items-center gap-2">
            <GitMerge className="h-4 w-4 text-purple-400" />
            LangGraph 17-Node StateGraph Execution Pipeline
          </h2>
          <p className="text-xs text-slate-400">Live visual state machine trace of DeployGuard operational workflow</p>
        </div>
        <span className="label-caps bg-purple-500/10 text-purple-300 border border-purple-500/30 px-2.5 py-1 rounded">
          STATEGRAPH EXECUTING (NODE 11)
        </span>
      </div>

      <div className="space-y-3">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`stitch-card p-3.5 flex items-center justify-between transition-all ${
              step.status === 'completed'
                ? 'border-l-4 border-l-emerald-500 bg-slate-900/60'
                : step.status === 'pending'
                ? 'border-l-4 border-l-amber-500 bg-amber-500/10 ring-1 ring-amber-500/30'
                : 'border-l-4 border-l-slate-800 opacity-50 bg-slate-950/60'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <span className="label-caps text-slate-400 w-6 text-right font-bold">#{step.id}</span>
              <div>
                <p className="text-xs font-bold text-white font-mono-code flex items-center gap-2">
                  {step.name}
                  {step.status === 'completed' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                  {step.status === 'pending' && <Clock className="h-3.5 w-3.5 text-amber-400 animate-spin" />}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">{step.desc}</p>
              </div>
            </div>

            <span className={`label-caps px-2.5 py-1 rounded text-[9px] ${
              step.status === 'completed'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : step.status === 'pending'
                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                : 'bg-slate-900 text-slate-500 border border-slate-800'
            }`}>
              {step.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
