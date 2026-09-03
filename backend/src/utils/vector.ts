// ============================================================================
// DeployGuard AI - Vector Utilities & Embedding Normalization
// ============================================================================

export const EMBEDDING_DIMENSION = 768;

export function validateEmbedding(embedding: number[], requiredDim: number = EMBEDDING_DIMENSION): void {
  if (!Array.isArray(embedding)) {
    throw new Error(`Invalid embedding: Expected an array of numbers, got ${typeof embedding}`);
  }
  if (embedding.length !== requiredDim) {
    throw new Error(`Invalid embedding dimension: Expected ${requiredDim} dimensions, got ${embedding.length}`);
  }
  for (let i = 0; i < embedding.length; i++) {
    if (typeof embedding[i] !== 'number' || isNaN(embedding[i])) {
      throw new Error(`Invalid embedding value at index ${i}: Must be a valid float number`);
    }
  }
}

export function computeCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error(`Vector dimensions mismatch: ${vecA.length} vs ${vecB.length}`);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function normalizeVector(vec: number[]): number[] {
  let norm = 0;
  for (let i = 0; i < vec.length; i++) {
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm);
  if (norm === 0) return vec.slice();
  return vec.map(v => v / norm);
}

export function generateMockEmbedding(seedText: string, dim: number = EMBEDDING_DIMENSION): number[] {
  const vec: number[] = new Array(dim);
  let hash = 0;
  for (let i = 0; i < seedText.length; i++) {
    hash = (hash << 5) - hash + seedText.charCodeAt(i);
    hash |= 0;
  }

  for (let i = 0; i < dim; i++) {
    const val = Math.sin(hash + i * 0.314159) * Math.cos(i * 0.1);
    vec[i] = val;
  }

  return normalizeVector(vec);
}
