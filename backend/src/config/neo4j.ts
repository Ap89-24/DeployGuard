// ============================================================================
// DeployGuard AI - Neo4j Driver Connection & Session Management
// ============================================================================

import neo4j, { Driver, Session, SessionMode, isInt } from 'neo4j-driver';
import dotenv from 'dotenv';

dotenv.config();

export interface Neo4jConfig {
  uri: string;
  user: string;
  pass: string;
  database: string;
}

function getNeo4jConfig(): Neo4jConfig {
  return {
    uri: process.env.NEO4J_URI || 'neo4j://localhost:7687',
    user: process.env.NEO4J_USERNAME || 'neo4j',
    pass: process.env.NEO4J_PASSWORD || 'deployguard_secret',
    database: process.env.NEO4J_DATABASE || 'neo4j',
  };
}

let driverInstance: Driver | null = null;

export function getNeo4jDriver(customConfig?: Partial<Neo4jConfig>): Driver {
  if (driverInstance) return driverInstance;

  const config = { ...getNeo4jConfig(), ...customConfig };
  driverInstance = neo4j.driver(
    config.uri,
    neo4j.auth.basic(config.user, config.pass),
    {
      maxConnectionPoolSize: 50,
      connectionTimeout: 10000,
      logging: {
        level: process.env.LOG_LEVEL === 'debug' ? 'debug' : 'error',
        logger: (level, message) => console.log(`[Neo4j Driver][${level}] ${message}`),
      },
    }
  );

  return driverInstance;
}

export async function verifyNeo4jConnection(driver?: Driver): Promise<boolean> {
  const drv = driver || getNeo4jDriver();
  try {
    await drv.verifyConnectivity();
    console.log('[Neo4j Config] Connection verified successfully.');
    return true;
  } catch (err) {
    console.error('[Neo4j Config] Connection verification failed:', err);
    return false;
  }
}

export async function executeCypher<T = any>(
  query: string,
  params: Record<string, any> = {},
  mode: SessionMode = 'WRITE',
  customDatabase?: string
): Promise<T[]> {
  const driver = getNeo4jDriver();
  const dbName = customDatabase || process.env.NEO4J_DATABASE || 'neo4j';
  const session: Session = driver.session({ defaultAccessMode: mode, database: dbName });

  try {
    const result = await session.run(query, params);
    return result.records.map(record => formatRecordFields(record.toObject()) as T);
  } catch (error) {
    console.error(`[Neo4j Query Error] Execution failed for query:\n${query}\nError:`, error);
    throw error;
  } finally {
    await session.close();
  }
}

export async function closeNeo4jDriver(): Promise<void> {
  if (driverInstance) {
    await driverInstance.close();
    driverInstance = null;
    console.log('[Neo4j Config] Driver connection closed.');
  }
}

export function formatRecordFields(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (isInt(obj)) {
    return obj.toNumber();
  }

  if (Array.isArray(obj)) {
    return obj.map(item => formatRecordFields(item));
  }

  if (typeof obj === 'object') {
    if ('properties' in obj && typeof obj.properties === 'object') {
      return formatRecordFields(obj.properties);
    }
    const formatted: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      formatted[key] = formatRecordFields(obj[key]);
    }
    return formatted;
  }

  return obj;
}
