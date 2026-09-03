import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { TopologyGraph } from './components/TopologyGraph';
import { BlastRadiusVisualizer } from './components/BlastRadiusVisualizer';
import { VectorMemorySearch } from './components/VectorMemorySearch';
import { LangGraphWorkflowTrace } from './components/LangGraphWorkflowTrace';
import { IntegrationsPage } from './components/IntegrationsPage';
import { IncidentsPage } from './components/IncidentsPage';
import { ApprovalModal } from './components/ApprovalModal';
import { Cpu, AlertTriangle, Database, Activity, Radio, CheckCircle2 } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isSimulating, setIsSimulating] = useState(false);
  const [isApprovalOpen, setIsApprovalOpen] = useState(false);
  const [liveWsEvents, setLiveWsEvents] = useState<any[]>([]);
  const [wsConnected, setWsConnected] = useState<boolean>(false);

  // WebSocket Connection to Real-Time Backend Event Stream
  useEffect(() => {
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket('ws://localhost:4000/ws');

      ws.onopen = () => {
        console.log('[React WS Client] Connected to ws://localhost:4000/ws');
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[React WS Client] Live Event Received:', data);
          setLiveWsEvents((prev) => [data, ...prev.slice(0, 4)]);
        } catch (e) {
          console.error(e);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
      };
    } catch (err) {
      console.warn('WebSocket connection error:', err);
    }

    return () => {
      if (ws) ws.close();
    };
  }, []);

  const triggerSimulation = async () => {
    setIsSimulating(true);
    try {
      await fetch('/api/v1/workflows/trigger', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    } catch (e) {
      console.warn(e);
    }
    setTimeout(() => {
      setIsSimulating(false);
      setIsApprovalOpen(true);
    }, 1100);
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* SaaS Left Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingApprovalsCount={1}
        activeIncidentsCount={1}
      />

      {/* Main SaaS Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopNav
          onTriggerSimulation={triggerSimulation}
          isSimulating={isSimulating}
        />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Real-time WebSocket Live Feed Banner */}
          <div className="stitch-card p-3 bg-slate-900/90 border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-xs font-mono">
              <Radio className={`h-4 w-4 ${wsConnected ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
              <span className="text-slate-300">WebSocket Live Stream:</span>
              <span className={wsConnected ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                {wsConnected ? 'CONNECTED (ws://localhost:4000/ws)' : 'DISCONNECTED (Mock Mode Active)'}
              </span>
            </div>
            {liveWsEvents.length > 0 && (
              <span className="label-caps bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded truncate max-w-md">
                Latest Event: {liveWsEvents[0].type || liveWsEvents[0].message}
              </span>
            )}
          </div>

          {/* Mission Control Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stat Gauges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="stitch-card p-4 flex items-center justify-between border-l-4 border-l-cyan-500 bg-slate-900/60">
                  <div>
                    <p className="label-caps text-slate-400">Monitored Services</p>
                    <p className="font-geist text-2xl font-extrabold text-white mt-1">4 Services</p>
                  </div>
                  <Cpu className="h-8 w-8 text-cyan-400/80 shrink-0" />
                </div>

                <div className="stitch-card p-4 flex items-center justify-between border-l-4 border-l-emerald-500 bg-slate-900/60">
                  <div>
                    <p className="label-caps text-slate-400">Active Canary Rollouts</p>
                    <p className="font-geist text-2xl font-extrabold text-emerald-400 mt-1">1 Active (v2.5.0)</p>
                  </div>
                  <Activity className="h-8 w-8 text-emerald-400/80 shrink-0" />
                </div>

                <div className="stitch-card p-4 flex items-center justify-between border-l-4 border-l-rose-500 bg-slate-900/60 shadow-lg shadow-rose-500/10">
                  <div>
                    <p className="label-caps text-slate-400">Active Incidents</p>
                    <p className="font-geist text-2xl font-extrabold text-rose-400 mt-1">1 Critical</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-rose-400 animate-pulse shrink-0" />
                </div>

                <div className="stitch-card p-4 flex items-center justify-between border-l-4 border-l-purple-500 bg-slate-900/60">
                  <div>
                    <p className="label-caps text-slate-400">768d Vector Memory</p>
                    <p className="font-geist text-2xl font-extrabold text-purple-300 mt-1">1,420 Embeddings</p>
                  </div>
                  <Database className="h-8 w-8 text-purple-400/80 shrink-0" />
                </div>
              </div>

              {/* Topology & Blast Radius Inspector */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TopologyGraph />
                <BlastRadiusVisualizer />
              </div>

              {/* Vector Memory Sandbox */}
              <VectorMemorySearch />
            </div>
          )}

          {/* Navigation Views */}
          {activeTab === 'topology' && <TopologyGraph />}
          {activeTab === 'blast-radius' && <BlastRadiusVisualizer />}
          {activeTab === 'vector-memory' && <VectorMemorySearch />}
          {activeTab === 'workflow' && <LangGraphWorkflowTrace />}
          {activeTab === 'incidents' && <IncidentsPage />}
          {activeTab === 'integrations' && <IntegrationsPage />}
          {activeTab === 'approvals' && (
            <div className="stitch-card p-6">
              <h2 className="font-geist text-base font-bold text-white mb-4">SRE Human-in-the-Loop Pending Approvals</h2>
              <div className="stitch-card p-4 bg-slate-900/80 border-slate-800 flex items-center justify-between">
                <div>
                  <span className="label-caps bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded">
                    PENDING APPROVAL #dec-2026-903-01
                  </span>
                  <p className="text-sm font-bold text-white mt-2">Rollback auth-service (Canary release v2.5.0)</p>
                  <p className="text-xs text-slate-400 mt-1">High correlation with 18% HTTP 500 error spike. Blast radius score: 88%.</p>
                </div>
                <button
                  onClick={() => setIsApprovalOpen(true)}
                  className="btn-cyan-glow px-4 py-2 text-xs font-bold uppercase rounded cursor-pointer"
                >
                  Review & Approve
                </button>
              </div>
            </div>
          )}
          {activeTab === 'settings' && (
            <div className="stitch-card p-6">
              <h2 className="font-geist text-base font-bold text-white mb-2">Organization & Safety Policies</h2>
              <p className="text-xs text-slate-400">Manage multi-tenant organization safety thresholds and deterministic rollback weights.</p>
            </div>
          )}
        </main>
      </div>

      {/* Human Approval Audit Modal */}
      <ApprovalModal
        isOpen={isApprovalOpen}
        onClose={() => setIsApprovalOpen(false)}
        decisionId="dec-2026-903-01"
        action="ROLLBACK"
        serviceName="auth-service (Canary v2.5.0)"
        rationale="High correlation between auth-service deployment v2.5.0 and 18% HTTP 500 error spike. Blast radius impacts payment-service and checkout-service. Rollback safety checks passed."
      />
    </div>
  );
}

export default App;
