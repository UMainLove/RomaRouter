import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Build della mappa dei quartieri (codice di terzi, si rifà con scripts/mappa.sh).
    "public/quartieri/**",
    // Mappe delle sezioni: base di terzi e build (si rifanno con npm run mappe:build, vedi mappe/README.md).
    "mappe/base/**",
    "public/mappe/**",
    // Il video di presentazione ha il suo progetto (video/package.json).
    "video/**",
  ]),
]);

export default eslintConfig;
