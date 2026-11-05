/** 첫 소원이 모델 로딩을 기다리지 않도록 서버가 뜰 때 미리 불러온다. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { loadEmbeddingModel } = await import("./lib/embedding");
  loadEmbeddingModel().catch((error) => console.error("임베딩 모델 로딩 실패", error));
}
