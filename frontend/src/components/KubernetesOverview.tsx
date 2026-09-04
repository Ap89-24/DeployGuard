import React from 'react';
import {
  Activity,
  Box,
  CheckCircle2,
  CircleAlert,
  Container,
  Cpu,
  Database,
  GitBranch,
  Radio,
  Server,
  TriangleAlert,
  XCircle,
} from 'lucide-react';

interface KubernetesOverviewProps {
  deployments: Record<string, any>;
  pods: Record<string, any>;
  events: any[];
  connected: boolean;
}

const getDeploymentStatus = (deployment: any) => {
  const status = deployment?.payload?.status;

  switch (status) {
    case 'HEALTHY':
      return {
        label: 'HEALTHY',
        className: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      };

    case 'DEGRADED':
      return {
        label: 'DEGRADED',
        className: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
        icon: <TriangleAlert className="h-3.5 w-3.5" />,
      };

    case 'ROLLING_OUT':
      return {
        label: 'ROLLING OUT',
        className: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        icon: <Activity className="h-3.5 w-3.5 animate-pulse" />,
      };

    case 'SCALED_TO_ZERO':
      return {
        label: 'SCALED TO ZERO',
        className: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
        icon: <CircleAlert className="h-3.5 w-3.5" />,
      };

    default:
      return {
        label: status || 'UNKNOWN',
        className: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
        icon: <CircleAlert className="h-3.5 w-3.5" />,
      };
  }
};

const getPodState = (event: any) => {
  const payload = event?.payload || {};

  return (
    payload.semanticState ||
    payload.currentState ||
    payload.state ||
    payload.rawState ||
    'UNKNOWN'
  );
};

const getPodStateStyle = (state: string) => {
  switch (state) {
    case 'RUNNING':
      return {
        label: 'RUNNING',
        className: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
        dot: 'bg-emerald-400',
      };

    case 'IMAGE_PULL_FAILURE':
    case 'ImagePullBackOff':
    case 'ErrImagePull':
      return {
        label: 'IMAGE PULL FAILURE',
        className: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
        dot: 'bg-rose-400',
      };

    case 'CRASH_LOOP':
    case 'CrashLoopBackOff':
      return {
        label: 'CRASH LOOP',
        className: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
        dot: 'bg-rose-400',
      };

    case 'OOM_KILLED':
      return {
        label: 'OOM KILLED',
        className: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
        dot: 'bg-rose-400',
      };

    case 'CONFIGURATION_ERROR':
      return {
        label: 'CONFIGURATION ERROR',
        className: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        dot: 'bg-amber-400',
      };

    case 'PENDING':
      return {
        label: 'PENDING',
        className: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        dot: 'bg-amber-400',
      };

    case 'FAILED':
    case 'TERMINATED':
      return {
        label: state,
        className: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
        dot: 'bg-rose-400',
      };

    default:
      return {
        label: state,
        className: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
        dot: 'bg-slate-400',
      };
  }
};

const getEventIcon = (type: string) => {
  switch (type) {
    case 'KUBERNETES_POD_STATE_CHANGE':
      return <Container className="h-4 w-4" />;

    case 'KUBERNETES_POD_RESTART':
      return <TriangleAlert className="h-4 w-4" />;

    case 'KUBERNETES_DEPLOYMENT_CHANGE':
      return <Server className="h-4 w-4" />;

    default:
      return <Activity className="h-4 w-4" />;
  }
};

const getEventIconClass = (event: any) => {
  const payload = event?.payload || {};

  if (
    payload.semanticState === 'IMAGE_PULL_FAILURE' ||
    payload.currentState === 'IMAGE_PULL_FAILURE' ||
    payload.currentState === 'CRASH_LOOP' ||
    payload.currentState === 'OOM_KILLED' ||
    payload.status === 'DEGRADED'
  ) {
    return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  }

  if (payload.status === 'HEALTHY' || payload.currentState === 'RUNNING') {
    return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  }

  return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
};

const getEventDescription = (event: any) => {
  const payload = event?.payload || {};

  if (event.type === 'KUBERNETES_DEPLOYMENT_CHANGE') {
    const desired = payload.desiredReplicas ?? 0;
    const available = payload.availableReplicas ?? 0;
    const ready = payload.readyReplicas ?? 0;

    return `${event.deploymentId || event.serviceId || 'deployment'} · ${payload.status || 'UPDATED'} · ${available}/${desired} available · ${ready}/${desired} ready`;
  }

  if (event.type === 'KUBERNETES_POD_STATE_CHANGE') {
    const previous = payload.previousState || 'UNKNOWN';
    const current = payload.currentState || payload.semanticState || 'UNKNOWN';

    return `${payload.podName || payload.pod || 'pod'} · ${previous} → ${current}`;
  }

  if (event.type === 'KUBERNETES_POD_RESTART') {
    return `${payload.podName || 'pod'} · restart count ${payload.restartCount ?? 0}`;
  }

  return payload.message || 'Kubernetes event received';
};

export function KubernetesOverview({
  deployments,
  pods,
  events,
  connected,
}: KubernetesOverviewProps) {
  const deploymentList = Object.values(deployments);

  const podList = Object.values(pods);

  const healthyDeployments = deploymentList.filter(
    (deployment) => deployment?.payload?.status === 'HEALTHY'
  ).length;

  const degradedDeployments = deploymentList.filter(
    (deployment) => deployment?.payload?.status === 'DEGRADED'
  ).length;

  const failingPods = podList.filter((pod) => {
    const state = getPodState(pod);

    return [
      'IMAGE_PULL_FAILURE',
      'CRASH_LOOP',
      'OOM_KILLED',
      'CONFIGURATION_ERROR',
      'FAILED',
    ].includes(state);
  }).length;

  const totalRestarts = podList.reduce((total, pod) => {
    return total + Number(pod?.payload?.restartCount || 0);
  }, 0);

  return (
    <div className="stitch-card bg-slate-900/70 border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <Server className="h-4 w-4 text-cyan-400" />
              </div>

              <div>
                <h2 className="font-geist text-sm font-bold text-white">
                  Kubernetes Infrastructure
                </h2>

                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                  Real-time cluster observation
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span className="text-slate-600">CLUSTER</span>
              <span className="text-slate-200">Docker Desktop</span>
            </div>

            <div className="h-4 w-px bg-slate-800" />

            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span className="text-slate-600">NAMESPACE</span>
              <span className="text-cyan-300">default</span>
            </div>

            <div className="h-4 w-px bg-slate-800" />

            <div className="flex items-center gap-1.5">
              <Radio
                className={`h-3.5 w-3.5 ${
                  connected
                    ? 'text-emerald-400 animate-pulse'
                    : 'text-slate-600'
                }`}
              />

              <span
                className={`text-[10px] font-mono font-bold ${
                  connected ? 'text-emerald-400' : 'text-slate-500'
                }`}
              >
                {connected ? 'LIVE' : 'OFFLINE'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-b border-slate-800">
        <div className="p-4 border-r border-slate-800">
          <p className="label-caps text-slate-500">Deployments</p>
          <p className="font-geist text-xl font-extrabold text-white mt-1">
            {deploymentList.length}
          </p>
        </div>

        <div className="p-4 md:border-r border-slate-800">
          <p className="label-caps text-slate-500">Healthy</p>
          <p className="font-geist text-xl font-extrabold text-emerald-400 mt-1">
            {healthyDeployments}
          </p>
        </div>

        <div className="p-4 border-r border-slate-800">
          <p className="label-caps text-slate-500">Degraded</p>
          <p className="font-geist text-xl font-extrabold text-rose-400 mt-1">
            {degradedDeployments}
          </p>
        </div>

        <div className="p-4">
          <p className="label-caps text-slate-500">Pod Restarts</p>
          <p className="font-geist text-xl font-extrabold text-amber-400 mt-1">
            {totalRestarts}
          </p>
        </div>
      </div>

      {/* Deployments */}
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Deployments
            </h3>
          </div>

          <span className="text-[10px] font-mono text-slate-500">
            {deploymentList.length} observed
          </span>
        </div>

        {deploymentList.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-800 p-8 text-center">
            <Server className="h-7 w-7 text-slate-700 mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-mono">
              Waiting for Kubernetes deployment events...
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {deploymentList.map((deployment: any) => {
              const payload = deployment.payload || {};
              const status = getDeploymentStatus(deployment);

              const desired = Number(payload.desiredReplicas ?? 0);
              const available = Number(payload.availableReplicas ?? 0);
              const ready = Number(payload.readyReplicas ?? 0);
              const unavailable = Number(payload.unavailableReplicas ?? 0);

              const availabilityPercent =
                desired > 0
                  ? Math.min(100, Math.round((available / desired) * 100))
                  : 0;

              return (
                <div
                  key={`${deployment.deploymentId || deployment.id}`}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                >
                  <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <GitBranch className="h-3.5 w-3.5 text-cyan-400" />

                        <span className="text-sm font-bold text-white font-mono">
                          {deployment.deploymentId ||
                            deployment.serviceId ||
                            'unknown'}
                        </span>

                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[9px] font-mono font-bold ${status.className}`}
                        >
                          {status.icon}
                          {status.label}
                        </span>
                      </div>

                      <p className="text-[10px] text-slate-500 font-mono mt-2">
                        namespace: {payload.namespace || 'default'}
                        {payload.revision
                          ? ` · revision: ${payload.revision}`
                          : ''}
                      </p>
                    </div>

                    <div className="grid grid-cols-4 gap-5">
                      <ReplicaStat
                        label="DESIRED"
                        value={desired}
                        type="normal"
                      />

                      <ReplicaStat
                        label="AVAILABLE"
                        value={available}
                        type={available < desired ? 'danger' : 'success'}
                      />

                      <ReplicaStat
                        label="READY"
                        value={ready}
                        type={ready < desired ? 'danger' : 'success'}
                      />

                      <ReplicaStat
                        label="UNAVAILABLE"
                        value={unavailable}
                        type={unavailable > 0 ? 'warning' : 'success'}
                      />
                    </div>
                  </div>

                  {/* Replica health bar */}
                  <div className="mt-4">
                    <div className="flex justify-between mb-1.5">
                      <span className="text-[9px] text-slate-500 font-mono">
                        REPLICA AVAILABILITY
                      </span>

                      <span className="text-[9px] text-slate-400 font-mono">
                        {availabilityPercent}%
                      </span>
                    </div>

                    <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 bg-cyan-400"
                        style={{ width: `${availabilityPercent}%` }}
                      />
                    </div>
                  </div>

                  {payload.message && (
                    <p className="text-[10px] text-slate-500 font-mono mt-3">
                      {payload.message}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pods */}
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Container className="h-4 w-4 text-purple-400" />

            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Pods
            </h3>
          </div>

          <div className="flex items-center gap-3 text-[10px] font-mono">
            <span className="text-slate-500">
              {podList.length} observed
            </span>

            {failingPods > 0 && (
              <span className="text-rose-400">
                {failingPods} failing
              </span>
            )}
          </div>
        </div>

        {podList.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-800 p-8 text-center">
            <Container className="h-7 w-7 text-slate-700 mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-mono">
              Waiting for Kubernetes pod events...
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {podList.map((pod: any) => {
              const payload = pod.payload || {};
              const state = getPodState(pod);
              const stateStyle = getPodStateStyle(state);

              return (
                <div
                  key={`${payload.podName || payload.pod || pod.id}`}
                  className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-lg border border-slate-800/80 bg-slate-950/50 px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`h-2 w-2 rounded-full shrink-0 ${stateStyle.dot} ${
                        state !== 'RUNNING' ? 'animate-pulse' : ''
                      }`}
                    />

                    <div className="min-w-0">
                      <p className="text-xs font-mono font-bold text-slate-200 truncate">
                        {payload.podName ||
                          payload.pod ||
                          'unknown-pod'}
                      </p>

                      <p className="text-[9px] font-mono text-slate-600 mt-0.5">
                        {payload.namespace || 'default'}
                        {payload.nodeName
                          ? ` · node: ${payload.nodeName}`
                          : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-5">
                    <div className="text-right">
                      <p className="text-[9px] text-slate-600 font-mono">
                        RESTARTS
                      </p>

                      <p className="text-xs font-mono text-slate-300">
                        {payload.restartCount ?? 0}
                      </p>
                    </div>

                    <span
                      className={`inline-flex items-center px-2 py-1 rounded border text-[9px] font-mono font-bold whitespace-nowrap ${stateStyle.className}`}
                    >
                      {stateStyle.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Live events */}
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-400" />

              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Live Kubernetes Events
              </h3>
            </div>

            <p className="text-[9px] text-slate-600 font-mono mt-1">
              Events received directly from the Kubernetes watcher
            </p>
          </div>

          {connected && (
            <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              STREAMING
            </div>
          )}
        </div>

        {events.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-800 p-6 text-center">
            <Radio className="h-6 w-6 text-slate-700 mx-auto mb-2" />

            <p className="text-xs text-slate-500 font-mono">
              Waiting for live Kubernetes events...
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {events.slice(0, 8).map((event: any, index: number) => (
              <div
                key={`${event.id}-${index}`}
                className="flex items-center gap-3 rounded-lg border border-slate-800/70 bg-slate-950/50 px-3 py-2.5"
              >
                <div
                  className={`h-8 w-8 rounded-md border flex items-center justify-center shrink-0 ${getEventIconClass(
                    event
                  )}`}
                >
                  {getEventIcon(event.type)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-slate-300">
                      {event.type}
                    </span>

                    {event.serviceId && (
                      <span className="text-[9px] font-mono text-cyan-400">
                        {event.serviceId}
                      </span>
                    )}
                  </div>

                  <p className="text-[9px] font-mono text-slate-500 mt-0.5 truncate">
                    {getEventDescription(event)}
                  </p>
                </div>

                <span className="text-[9px] font-mono text-slate-600 shrink-0">
                  {event.timestamp
                    ? new Date(event.timestamp).toLocaleTimeString()
                    : '--:--'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface ReplicaStatProps {
  label: string;
  value: number;
  type: 'normal' | 'success' | 'danger' | 'warning';
}

function ReplicaStat({ label, value, type }: ReplicaStatProps) {
  const valueClass =
    type === 'success'
      ? 'text-emerald-400'
      : type === 'danger'
      ? 'text-rose-400'
      : type === 'warning'
      ? 'text-amber-400'
      : 'text-white';

  return (
    <div className="text-right">
      <p className="text-[9px] text-slate-600 font-mono">
        {label}
      </p>

      <p className={`text-sm font-geist font-extrabold ${valueClass}`}>
        {value}
      </p>
    </div>
  );
}

export default KubernetesOverview;