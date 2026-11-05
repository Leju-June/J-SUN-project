import type { NextConfig } from "next";

const config: NextConfig = {
  // ONNX 런타임은 네이티브 모듈이라 번들하지 않고 Node에서 그대로 불러온다.
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node", "sharp"],
};

export default config;
