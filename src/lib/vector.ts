export function createVectorLiteral(embedding: readonly number[]) {
  return `[${embedding.join(",")}]`;
}

/**
 * Fits provider embeddings to the pgvector width expected by the active schema.
 */
export function normalizeEmbeddingDimensions(
  embedding: readonly number[],
  targetDimensions: number,
) {
  if (embedding.length === targetDimensions) {
    return [...embedding];
  }

  if (embedding.length > targetDimensions) {
    return embedding.slice(0, targetDimensions);
  }

  return [
    ...embedding,
    ...new Array(targetDimensions - embedding.length).fill(0),
  ];
}
