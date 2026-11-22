import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Todo o painel é autenticado e dinâmico (cookies em cada requisição).
  // Cache Components fica desligado por enquanto; ligar depois se quisermos
  // cachear partes públicas ou pesadas com "use cache".
  cacheComponents: false,
  partialPrefetching: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
