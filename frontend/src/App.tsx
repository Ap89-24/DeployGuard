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
import { KubernetesEventModal } from './components/KubernetesEventModal';
import { KubernetesOverview } from './components/KubernetesOverview';

import {
  Cpu,
  AlertTriangle,
  Database,
  Activity,
  Radio,
} from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');

  const [isSimulating, setIsSimulating] = useState(false);
  const [isApprovalOpen, setIsApprovalOpen] = useState(false);

  const [selectedKubeEvent, setSelectedKubeEvent] =
    useState<any | null>(null);

  /*
   * ============================================================
   * REAL-TIME WEBSOCKET STATE
   * ============================================================
   */

  const [liveWsEvents, setLiveWsEvents] = useState<any[]>([]);
  const [wsConnected, setWsConnected] = useState(false);

  /*
   * ============================================================
   * REAL-TIME KUBERNETES STATE
   * ============================================================
   */

  const [kubernetesEvents, setKubernetesEvents] = useState<any[]>([]);

  const [kubernetesDeployments, setKubernetesDeployments] =
    useState<Record<string, any>>({});

  const [kubernetesPods, setKubernetesPods] =
    useState<Record<string, any>>({});

  const [liveServices, setLiveServices] =
    useState<Set<string>>(new Set());

  const [lastKubernetesEvent, setLastKubernetesEvent] =
    useState<any>(null);
  
  /*
 * ============================================================
 * INITIAL KUBERNETES STATE SNAPSHOT
 * ============================================================
 *
 * WebSocket only delivers events that happen after the
 * frontend connects.
 *
 * This REST request loads the current Kubernetes state first.
 */
useEffect(() => {
  let cancelled = false;

  const loadKubernetesState = async () => {
    try {
      console.log(
        '[React Kubernetes] Loading current cluster state...',
      );

      const response = await fetch(
        'http://localhost:4000/api/v1/kubernetes/state',
      );

      if (!response.ok) {
        throw new Error(
          `Kubernetes state request failed: ${response.status}`,
        );
      }

      const data = await response.json();

      if (cancelled) {
        return;
      }

      console.log(
        '[React Kubernetes] Current state:',
        data,
      );

      /*
       * Load deployments.
       */
      if (Array.isArray(data.deployments)) {
        const deploymentMap: Record<string, any> = {};

        for (const deployment of data.deployments) {
          const deploymentId =
            deployment.deploymentId ||
            deployment.payload?.deploymentId ||
            deployment.serviceId;

          if (deploymentId) {
            deploymentMap[deploymentId] =
              deployment;
          }
        }

        setKubernetesDeployments(
          deploymentMap,
        );
      }

      /*
       * Load pods.
       */
      if (Array.isArray(data.pods)) {
        const podMap: Record<string, any> = {};

        for (const pod of data.pods) {
          const podName =
            pod.payload?.podName ||
            pod.payload?.pod;

          if (podName) {
            podMap[podName] = pod;
          }
        }

        setKubernetesPods(
          podMap,
        );
      }

      /*
       * Track services from the initial snapshot.
       */
      const services =
        new Set<string>();

      for (const deployment of data.deployments ?? []) {
        if (deployment.serviceId) {
          services.add(
            deployment.serviceId,
          );
        }
      }

      for (const pod of data.pods ?? []) {
        if (pod.serviceId) {
          services.add(
            pod.serviceId,
          );
        }
      }

      if (services.size > 0) {
        setLiveServices(services);
      }

    } catch (error) {
      console.error(
        '[React Kubernetes] Failed to load current state:',
        error,
      );
    }
  };

  loadKubernetesState();

  return () => {
    cancelled = true;
  };
}, []);

  /*
   * ============================================================
   * WEBSOCKET CONNECTION
   * ============================================================
   *
   * Backend:
   *
   * ws://localhost:4000/ws
   *
   * Kubernetes Watcher
   *        ↓
   * EventBus
   *        ↓
   * WebSocket
   *        ↓
   * React
   *
   * ============================================================
   */

  useEffect(() => {
    let ws: WebSocket | null = null;

    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    let isUnmounted = false;

    const connect = () => {
      if (isUnmounted) {
        return;
      }

      console.log(
        '[React WS Client] Connecting to DeployGuard live stream...'
      );

      ws = new WebSocket('ws://localhost:4000/ws');

      /*
       * ----------------------------------------------------------
       * CONNECTION OPEN
       * ----------------------------------------------------------
       */

      ws.onopen = () => {
        console.log(
          '[React WS Client] Connected to ws://localhost:4000/ws'
        );

        setWsConnected(true);
      };

      /*
       * ----------------------------------------------------------
       * MESSAGE RECEIVED
       * ----------------------------------------------------------
       */

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          console.log(
            '[React WS Client] Live Event Received:',
            data
          );

          /*
           * Store latest five websocket messages.
           */
          setLiveWsEvents((previous) => [
            data,
            ...previous.slice(0, 4),
          ]);

          /*
           * Backend wraps domain events like:
           *
           * {
           *   type: "DEPLOYGUARD_EVENT",
           *   timestamp: "...",
           *   event: {
           *      id: "...",
           *      type: "...",
           *      provider: "kubernetes",
           *      payload: {...}
           *   }
           * }
           */

          const domainEvent = data?.event;

          /*
           * SYSTEM_CONNECTED message does not contain
           * a domain event.
           */
          if (!domainEvent) {
            return;
          }

          /*
           * ======================================================
           * KUBERNETES EVENTS
           * ======================================================
           */

          if (domainEvent.provider === 'kubernetes') {
            console.log(
              '[React] Kubernetes event:',
              domainEvent
            );

            /*
             * ----------------------------------------------------
             * EVENT HISTORY
             * ----------------------------------------------------
             *
             * Keep latest 20 Kubernetes events.
             */

            setKubernetesEvents((previous) => [
              domainEvent,
              ...previous.slice(0, 19),
            ]);

            setLastKubernetesEvent(domainEvent);

            /*
             * ----------------------------------------------------
             * TRACK SERVICES
             * ----------------------------------------------------
             */

            if (domainEvent.serviceId) {
              setLiveServices((previous) => {
                const next = new Set(previous);

                next.add(domainEvent.serviceId);

                return next;
              });
            }

            /*
             * ====================================================
             * DEPLOYMENT STATE
             * ====================================================
             *
             * Event:
             *
             * KUBERNETES_DEPLOYMENT_CHANGE
             *
             * Example payload:
             *
             * {
             *   desiredReplicas: 4,
             *   availableReplicas: 3,
             *   readyReplicas: 3,
             *   unavailableReplicas: 2,
             *   status: "DEGRADED"
             * }
             */

            if (
              domainEvent.type ===
              'KUBERNETES_DEPLOYMENT_CHANGE'
            ) {
              const deploymentId =
                domainEvent.deploymentId ||
                domainEvent.payload?.deploymentId ||
                domainEvent.serviceId;

              if (deploymentId) {
                setKubernetesDeployments((previous) => ({
                  ...previous,

                  [deploymentId]: domainEvent,
                }));
              }
            }

            /*
             * ====================================================
             * POD STATE
             * ====================================================
             *
             * Events:
             *
             * KUBERNETES_POD_STATE_CHANGE
             * KUBERNETES_POD_RESTART
             */

            if (
              domainEvent.type ===
                'KUBERNETES_POD_STATE_CHANGE' ||
              domainEvent.type ===
                'KUBERNETES_POD_RESTART'
            ) {
              const podName =
                domainEvent.payload?.podName ||
                domainEvent.payload?.pod;

              if (podName) {
                setKubernetesPods((previous) => ({
                  ...previous,

                  [podName]: domainEvent,
                }));
              }
            }
          }
        } catch (error) {
          console.error(
            '[React WS Client] Failed to process event:',
            error
          );
        }
      };

      /*
       * ----------------------------------------------------------
       * WEBSOCKET ERROR
       * ----------------------------------------------------------
       */

      ws.onerror = (error) => {
        console.error(
          '[React WS Client] WebSocket error:',
          error
        );
      };

      /*
       * ----------------------------------------------------------
       * CONNECTION CLOSED
       * ----------------------------------------------------------
       *
       * Automatically reconnect after 3 seconds.
       */

      ws.onclose = () => {
        console.warn(
          '[React WS Client] WebSocket disconnected.'
        );

        setWsConnected(false);

        if (!isUnmounted) {
          reconnectTimer = setTimeout(() => {
            connect();
          }, 3000);
        }
      };
    };

    /*
     * Initial connection.
     */

    connect();

    /*
     * Cleanup.
     */

    return () => {
      isUnmounted = true;

      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }

      if (ws) {
        ws.close();
      }
    };
  }, []);

  /*
   * ============================================================
   * WORKFLOW SIMULATION
   * ============================================================
   *
   * Existing functionality retained.
   *
   * NOTE:
   * This is still your existing workflow trigger and should
   * eventually be replaced by the real incident pipeline.
   *
   * ============================================================
   */

  const triggerSimulation = async () => {
    setIsSimulating(true);

    try {
      await fetch('/api/v1/workflows/trigger', {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({}),
      });
    } catch (error) {
      console.warn(
        '[DeployGuard] Workflow trigger failed:',
        error
      );
    }

    setTimeout(() => {
      setIsSimulating(false);

      setIsApprovalOpen(true);
    }, 1100);
  };

  /*
   * ============================================================
   * EVENT SUMMARY
   * ============================================================
   */

  const getEventSummaryText = (event: any) => {
    const payload = event?.payload || {};

    /*
     * Deployment event.
     */

    if (
      event.type ===
      'KUBERNETES_DEPLOYMENT_CHANGE'
    ) {
      const desired =
        payload.desiredReplicas ?? 0;

      const available =
        payload.availableReplicas ?? 0;

      const ready =
        payload.readyReplicas ?? 0;

      const status =
        payload.status || 'UPDATED';

      return `Deployment '${
        event.serviceId || 'workload'
      }' status: ${status} (Available: ${available}/${desired}, Ready: ${ready}/${desired})`;
    }

    /*
     * Pod state change.
     */

    if (
      event.type ===
      'KUBERNETES_POD_STATE_CHANGE'
    ) {
      const pod =
        payload.podName ||
        payload.pod ||
        'pod';

      const previous =
        payload.previousState ||
        'UNKNOWN';

      const current =
        payload.currentState ||
        payload.semanticState ||
        payload.rawState ||
        'UNKNOWN';

      return `Pod '${pod}' state changed: ${previous} → ${current}`;
    }

    /*
     * Pod restart.
     */

    if (
      event.type ===
      'KUBERNETES_POD_RESTART'
    ) {
      const restartCount =
        payload.restartCount ?? 0;

      const pod =
        payload.podName ||
        payload.pod ||
        'pod';

      return `Pod '${pod}' restart count: ${restartCount}`;
    }

    /*
     * Fallback.
     */

    return (
      payload.message ||
      'Kubernetes cluster event detected'
    );
  };

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">

      {/* ========================================================
          SIDEBAR
          ======================================================== */}

      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingApprovalsCount={1}
        activeIncidentsCount={1}
      />

      {/* ========================================================
          MAIN WORKSPACE
          ======================================================== */}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ======================================================
            TOP NAVIGATION
            ====================================================== */}

        <TopNav
          onTriggerSimulation={triggerSimulation}
          isSimulating={isSimulating}
        />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ====================================================
              WEBSOCKET LIVE STATUS
              ==================================================== */}

          <div className="stitch-card p-3 bg-slate-900/90 border-slate-800 flex items-center justify-between">

            <div className="flex items-center gap-2.5 text-xs font-mono">

              <Radio
                className={`h-4 w-4 ${
                  wsConnected
                    ? 'text-emerald-400 animate-pulse'
                    : 'text-slate-500'
                }`}
              />

              <span className="text-slate-300">
                WebSocket Live Stream:
              </span>

              <span
                className={
                  wsConnected
                    ? 'text-emerald-400 font-bold'
                    : 'text-slate-500'
                }
              >
                {wsConnected
                  ? 'CONNECTED (ws://localhost:4000/ws)'
                  : 'DISCONNECTED (Reconnecting...)'}
              </span>
            </div>

            {liveWsEvents.length > 0 && (
              <span className="label-caps bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded truncate max-w-md">

                Latest Event:{' '}

                {liveWsEvents[0]?.event?.type ||
                  liveWsEvents[0]?.type ||
                  'Connected'}

              </span>
            )}
          </div>

          {/* ====================================================
              OVERVIEW
              ==================================================== */}

          {activeTab === 'overview' && (
            <div className="space-y-6">

              {/* ==================================================
                  STAT GAUGES
                  ================================================== */}

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">

                {/* Monitored Services */}

                <div className="stitch-card p-4 flex items-center justify-between border-l-4 border-l-cyan-500 bg-slate-900/60">

                  <div>
                    <p className="label-caps text-slate-400">
                      Monitored Services
                    </p>

                    <p className="font-geist text-2xl font-extrabold text-white mt-1">
                      {liveServices.size} Services
                    </p>
                  </div>

                  <Cpu className="h-8 w-8 text-cyan-400/80 shrink-0" />
                </div>

                {/* Active Canary */}

                <div className="stitch-card p-4 flex items-center justify-between border-l-4 border-l-emerald-500 bg-slate-900/60">

                  <div>
                    <p className="label-caps text-slate-400">
                      Active Canary Rollouts
                    </p>

                    <p className="font-geist text-2xl font-extrabold text-emerald-400 mt-1">
                      1 Active (v2.5.0)
                    </p>
                  </div>

                  <Activity className="h-8 w-8 text-emerald-400/80 shrink-0" />
                </div>

                {/* Active Incidents */}

                <div className="stitch-card p-4 flex items-center justify-between border-l-4 border-l-rose-500 bg-slate-900/60 shadow-lg shadow-rose-500/10">

                  <div>
                    <p className="label-caps text-slate-400">
                      Active Incidents
                    </p>

                    <p className="font-geist text-2xl font-extrabold text-rose-400 mt-1">
                      1 Critical
                    </p>
                  </div>

                  <AlertTriangle className="h-8 w-8 text-rose-400 animate-pulse shrink-0" />
                </div>

                {/* Vector Memory */}

                <div className="stitch-card p-4 flex items-center justify-between border-l-4 border-l-purple-500 bg-slate-900/60">

                  <div>
                    <p className="label-caps text-slate-400">
                      768d Vector Memory
                    </p>

                    <p className="font-geist text-2xl font-extrabold text-purple-300 mt-1">
                      1,420 Embeddings
                    </p>
                  </div>

                  <Database className="h-8 w-8 text-purple-400/80 shrink-0" />
                </div>

                {/* Kubernetes events */}

                <div className="stitch-card p-4 border-l-4 border-l-cyan-500 bg-slate-900/60">

                  <div className="flex items-center justify-between">

                    <div>
                      <p className="label-caps text-slate-400">
                        Kubernetes Live Events
                      </p>

                      <p className="font-geist text-2xl font-extrabold text-white mt-1">
                        {kubernetesEvents.length}
                      </p>
                    </div>

                    <Radio
                      className={`h-8 w-8 ${
                        wsConnected
                          ? 'text-emerald-400 animate-pulse'
                          : 'text-slate-500'
                      }`}
                    />
                  </div>

                  {lastKubernetesEvent && (
                    <div className="mt-3 text-xs text-slate-400 font-mono">

                      <span className="text-cyan-400 font-bold">
                        {lastKubernetesEvent.type}
                      </span>

                      {lastKubernetesEvent.serviceId && (
                        <span>
                          {' '}
                          · {lastKubernetesEvent.serviceId}
                        </span>
                      )}

                    </div>
                  )}

                </div>
              </div>

              {/* ==================================================
                  REAL-TIME KUBERNETES INFRASTRUCTURE
                  ================================================== */}

              <KubernetesOverview
                deployments={kubernetesDeployments}
                pods={kubernetesPods}
                events={kubernetesEvents}
                connected={wsConnected}
              />

              {/* ==================================================
                  TOPOLOGY + BLAST RADIUS
                  ================================================== */}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                <TopologyGraph />

                <BlastRadiusVisualizer />

              </div>

              {/* ==================================================
                  VECTOR MEMORY
                  ================================================== */}

              <VectorMemorySearch />

            </div>
          )}

          {/* ======================================================
              TOPOLOGY
              ====================================================== */}

          {activeTab === 'topology' && (
            <TopologyGraph />
          )}

          {/* ======================================================
              BLAST RADIUS
              ====================================================== */}

          {activeTab === 'blast-radius' && (
            <BlastRadiusVisualizer />
          )}

          {/* ======================================================
              VECTOR MEMORY
              ====================================================== */}

          {activeTab === 'vector-memory' && (
            <VectorMemorySearch />
          )}

          {/* ======================================================
              LANGGRAPH WORKFLOW
              ====================================================== */}

          {activeTab === 'workflow' && (
            <LangGraphWorkflowTrace />
          )}

          {/* ======================================================
              INCIDENTS
              ====================================================== */}

          {activeTab === 'incidents' && (
            <IncidentsPage />
          )}

          {/* ======================================================
              INTEGRATIONS
              ====================================================== */}

          {activeTab === 'integrations' && (
            <IntegrationsPage />
          )}

          {/* ======================================================
              APPROVALS
              ====================================================== */}

          {activeTab === 'approvals' && (
            <div className="stitch-card p-6">

              <h2 className="font-geist text-base font-bold text-white mb-4">
                SRE Human-in-the-Loop Pending Approvals
              </h2>

              <div className="stitch-card p-4 bg-slate-900/80 border-slate-800 flex items-center justify-between">

                <div>

                  <span className="label-caps bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded">
                    PENDING APPROVAL #dec-2026-903-01
                  </span>

                  <p className="text-sm font-bold text-white mt-2">
                    Rollback auth-service (Canary release v2.5.0)
                  </p>

                  <p className="text-xs text-slate-400 mt-1">
                    High correlation with 18% HTTP 500 error spike.
                    Blast radius score: 88%.
                  </p>

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

          {/* ======================================================
              SETTINGS
              ====================================================== */}

          {activeTab === 'settings' && (
            <div className="stitch-card p-6">

              <h2 className="font-geist text-base font-bold text-white mb-2">
                Organization & Safety Policies
              </h2>

              <p className="text-xs text-slate-400">
                Manage multi-tenant organization safety thresholds
                and deterministic rollback weights.
              </p>

            </div>
          )}

        </main>
      </div>

      {/* ========================================================
          APPROVAL MODAL
          ======================================================== */}

      <ApprovalModal
        isOpen={isApprovalOpen}
        onClose={() => setIsApprovalOpen(false)}
        decisionId="dec-2026-903-01"
        action="ROLLBACK"
        serviceName="auth-service (Canary v2.5.0)"
        rationale="High correlation between auth-service deployment v2.5.0 and 18% HTTP 500 error spike. Blast radius impacts payment-service and checkout-service. Rollback safety checks passed."
      />

      {/* ========================================================
          KUBERNETES EVENT DETAILS MODAL
          ======================================================== */}

      <KubernetesEventModal
        event={selectedKubeEvent}
        onClose={() => setSelectedKubeEvent(null)}
      />

    </div>
  );
}

export default App;