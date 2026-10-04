import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const noPersistence = ["localStorage", "sessionStorage", "indexedDB"];
const noDom = ["window", "document", ...noPersistence];

const reactAndNext = {
  group: ["react", "react/*", "react-dom", "react-dom/*", "next", "next/*"],
  message: "lib/ and game engines are pure TypeScript.",
};
const upperLayers = {
  group: ["@/app/*", "@/components/*", "@/hooks/*", "@/session/*", "@/games/*/ui/*", "@/games/registry.ui"],
  message: "Dependencies point one way: app → components/game UI → session → engines/lib.",
};
const gameLogic = {
  group: ["**/engine", "**/rules", "@/lib/ledger/*", "@/lib/random/*", "@/lib/cards/shoe"],
  message: "UI renders views and dispatches actions; rules and money live in engines and the session.",
  allowTypeImports: true,
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**"],
    rules: { "no-restricted-globals": ["error", ...noPersistence] },
  },
  {
    files: ["src/lib/**", "src/games/*.ts", "src/games/*/{types,rules,engine,layout}.ts"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [reactAndNext, upperLayers] }],
      "no-restricted-globals": ["error", ...noDom],
    },
  },
  {
    files: ["src/lib/timing/**"],
    rules: { "no-restricted-globals": ["error", "document", ...noPersistence] },
  },
  {
    files: ["src/lib/security/**", "src/lib/random/**", "src/lib/cards/**", "src/lib/ledger/**"],
    ignores: ["**/*.test.ts"],
    rules: { "no-restricted-globals": ["error", "Math", ...noDom] },
  },
  {
    files: ["src/session/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ ...upperLayers, group: upperLayers.group.filter((g) => g !== "@/session/*") }] },
      ],
    },
  },
  {
    files: ["src/components/**", "src/games/*/ui/**", "src/games/GameStage/**", "src/app/**"],
    ignores: ["**/*.test.tsx"],
    rules: { "@typescript-eslint/no-restricted-imports": ["error", { patterns: [gameLogic] }] },
  },
  {
    files: ["src/components/**"],
    ignores: ["**/*.test.tsx"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            gameLogic,
            { group: ["@/games/*/ui/*", "@/games/registry.ui", "@/games/GameStage"], message: "Shared components don't know about specific games." },
          ],
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "test-results/**",
    "playwright-report/**",
  ]),
]);

export default eslintConfig;
