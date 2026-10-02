import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: [
    "tree-sitter",
    "tree-sitter-javascript",
    "tree-sitter-typescript",
    "onnxruntime-node",
    "sharp",
  ],
  transpilePackages: ["@xenova/transformers"],
  outputFileTracingIncludes: {
    "/api/chat": [
      "./node_modules/onnxruntime-node/bin/napi-v3/linux/**/*",
    ],
    "/api/projects/\\[id\\]/analyze": [
      "./node_modules/onnxruntime-node/bin/napi-v3/linux/**/*",
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "110mb",
    },
  },
};

export default nextConfig;