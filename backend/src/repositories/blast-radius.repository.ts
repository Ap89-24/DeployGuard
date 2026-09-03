// ============================================================================
// DeployGuard AI - Blast Radius Engine Repository
// ============================================================================

import { executeCypher } from '../config/neo4j.js';
import { Service, BlastRadiusResult, UpstreamDependent, DownstreamDependency } from '../types/domain.js';

export class BlastRadiusRepository {
  async computeBlastRadius(serviceId: string, maxDepth: number = 10): Promise<BlastRadiusResult> {
    const targetServiceQuery = `
      MATCH (s:Service { id: $serviceId })
      RETURN s
    `;
    const targetRecords = await executeCypher<{ s: Service }>(targetServiceQuery, { serviceId }, 'READ');
    if (targetRecords.length === 0) {
      throw new Error(`Service with ID '${serviceId}' not found in graph database.`);
    }
    const targetService = targetRecords[0].s;

    const upstreamQuery = `
      MATCH (target:Service { id: $serviceId })
      MATCH path = (upstream:Service)-[:DEPENDS_ON*1..${maxDepth}]->(target)
      WHERE upstream.id <> target.id
      WITH upstream, path, length(path) AS dist, [rel IN relationships(path) | rel.isCritical] as criticalFlags, [n IN nodes(path) | n.name] as nodeNames
      RETURN 
        upstream AS service, 
        min(dist) AS distance, 
        collect(nodeNames)[0] AS path,
        any(flag IN criticalFlags WHERE flag = true) AS isCriticalPath
      ORDER BY distance ASC, service.tier ASC
    `;

    const upstreamRecords = await executeCypher<{
      service: Service;
      distance: number;
      path: string[];
      isCriticalPath: boolean;
    }>(upstreamQuery, { serviceId }, 'READ');

    const upstreamServices: UpstreamDependent[] = upstreamRecords.map(r => ({
      service: r.service,
      distance: typeof r.distance === 'number' ? r.distance : parseInt(r.distance, 10),
      path: r.path || [],
      isCriticalPath: Boolean(r.isCriticalPath),
    }));

    const downstreamQuery = `
      MATCH (target:Service { id: $serviceId })
      MATCH path = (target)-[:DEPENDS_ON*1..${maxDepth}]->(downstream:Service)
      WHERE downstream.id <> target.id
      WITH downstream, path, length(path) AS dist, [rel IN relationships(path) | rel.protocol] as protocols, [n IN nodes(path) | n.name] as nodeNames
      RETURN 
        downstream AS service, 
        min(dist) AS distance, 
        collect(nodeNames)[0] AS path,
        protocols[0] AS protocol
      ORDER BY distance ASC
    `;

    const downstreamRecords = await executeCypher<{
      service: Service;
      distance: number;
      path: string[];
      protocol: string;
    }>(downstreamQuery, { serviceId }, 'READ');

    const downstreamServices: DownstreamDependency[] = downstreamRecords.map(r => ({
      service: r.service,
      distance: typeof r.distance === 'number' ? r.distance : parseInt(r.distance, 10),
      path: r.path || [],
      protocol: r.protocol || 'HTTP',
    }));

    const tier1Count = upstreamServices.filter(u => u.service.tier === 'tier-1').length;
    const maxDepthFound = Math.max(0, ...upstreamServices.map(u => u.distance));

    let rawScore = 0;
    for (const dep of upstreamServices) {
      const weight = dep.service.tier === 'tier-1' ? 2.5 : dep.service.tier === 'tier-2' ? 1.2 : 0.6;
      const decay = 1 / dep.distance;
      rawScore += weight * decay;
    }

    const blastRadiusScore = Math.min(1.0, parseFloat((1 - Math.exp(-rawScore / 4.0)).toFixed(3)));
    const summary = `Blast radius evaluation for '${targetService.name}': ${upstreamServices.length} upstream service(s) impacted (${tier1Count} Tier-1 critical). Max depth: ${maxDepthFound}. Risk Score: ${(blastRadiusScore * 100).toFixed(1)}%.`;

    return {
      targetService,
      upstreamDependentsCount: upstreamServices.length,
      upstreamServices,
      downstreamDependenciesCount: downstreamServices.length,
      downstreamServices,
      tier1ImpactedCount: tier1Count,
      maxDependencyDepth: maxDepthFound,
      blastRadiusScore,
      summary,
    };
  }
}
