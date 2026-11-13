import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Le pagine della v1 confluiscono in "Non è tra questi?" (assistente generale + mappa di tutti gli ambiti).
  async redirects() {
    return [
      // la v1 passava la richiesta in ?q=: in "Non è tra questi?" parte da sola con ?richiesta=
      { source: "/chiedi", has: [{ type: "query", key: "q", value: "(?<q>.+)" }], destination: "/altro?richiesta=:q", permanent: false },
      { source: "/chiedi", destination: "/altro", permanent: false },
      { source: "/mappa", destination: "/altro", permanent: false },
    ];
  },
  partialPrefetching: true,
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
