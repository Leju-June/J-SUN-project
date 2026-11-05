import { env, pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

const MODEL = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";

env.cacheDir = process.env.MODEL_CACHE_DIR ?? "./models";

let extractor: Promise<FeatureExtractionPipeline> | undefined;

export function loadEmbeddingModel() {
  extractor ??= pipeline("feature-extraction", MODEL, { dtype: "q8" }) as Promise<FeatureExtractionPipeline>;
  return extractor;
}

export async function embed(text: string) {
  const model = await loadEmbeddingModel();
  const output = await model(text, { pooling: "mean", normalize: true });
  return Array.from(output.data as Float32Array);
}
