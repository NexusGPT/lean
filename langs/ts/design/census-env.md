# Census environment: what an `unresolved-module` finding is, by kind

A census unit carries `unresolved-module` when a compiler diagnostic inside its lines says the checkout failed to
provide a module, a lib or a global type (`common.mjs` RESOLUTION_CODES). `census-env.mjs group <census.json>` puts
every such finding in exactly one kind and names the package state on the node_modules chain from the file:

- `lockfile`: a package the repository's lockfile pins; `workspace`: a package of its own workspace; `alias`: a name
  the governing tsconfig's own `paths` map; `builtin`: a Node built-in (declarations from `@types/node`).
- `relative`: a relative file that is absent, `(generated)` when its path sits under a generated folder; `absent`: a
  package nothing names; `member`: the module resolved but lacks the export (a version or entry-point mismatch).
- `global-node`, `global-lib`, `global-types`: a global from `@types/node`, from the configured `lib`/`target`, or from
  another `@types` package; `root-dir`: a file outside the project's `rootDir`.
- A tsconfig whose `extends` names a package that is not installed loses every option it inherits (`target`, `lib`,
  `moduleResolution`); the column "under a tsconfig whose extends was lost" counts the findings that stand under one.

Units are counted when a finding falls inside the unit's lines (an import line at the top of a file belongs to no
unit). "Units (first finding)" puts each unit in one bucket, the kind of its first finding.

Command: `node langs/ts/census-env.mjs group <W>/results-opaque-values/census-<nexus|lc>-after2.json --md <table>`.

## The two largest roots

### nexus

Root: `<W>/work/bench/nexus/tree`. Lockfile: `/Users/assem/Documents/GitHub/nexus/pnpm-lock.yaml`. Findings: 11504. Units with at least one: 1889.

| Kind | Units (any finding) | Units (first finding) | Findings | Under a tsconfig whose extends was lost | Package state | Top names |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| lockfile | 1674 | 1660 | 8730 | 7948 | installed 90, installed-incomplete 27, not-installed 8613 | `react/jsx-runtime` 2427, `react` 2326, `@agent-nexus/ui` 853, `@heroicons/react/24/outline` 444, `clsx` 324, `@agent-nexus/console-ui` 274, `@tanstack/react-query` 141, `@central-icons-react/round-outlined-radius-2-stroke-1.5` 138 |
| global-lib | 154 | 152 | 332 | 0 |  | `console` 160, `Promise` 119, `fetch` 25, `Office` 23, `URLSearchParams` 3, `setTimeout` 2 |
| global-node | 75 | 65 | 234 | 31 |  | `process` 162, `NodeJS` 34, `__dirname` 17, `require` 8, `Buffer` 7, `module` 6 |
| global-types | 10 | 10 | 12 | 0 |  | `PDFKit` 8, `React` 3, `Office` 1 |
| builtin | 2 | 2 | 114 | 6 |  | `path` 31, `fs` 17, `url` 12, `child_process` 10, `fs/promises` 10, `node:path` 8, `node:fs` 6, `querystring` 4 |
| root-dir | 0 | 0 | 19 | 0 |  | `(none)` 19 |
| member | 0 | 0 | 1755 | 376 | not-installed 1640, installed 115 | `"@nestjs/common"` 670, `"@nexus/types"` 433, `"@nexus/types/server"` 160, `"@nestjs/swagger"` 126, `@nestjs/common` 73, `"@nestjs/bull"` 48, `"@nestjs/core"` 46, `"@nexus/types/public-api-v1"` 44 |
| relative | 0 | 0 | 38 | 2 |  | `../dto/create-task.dto` 3, `../dto/generate-prompt.dto` 3, `../dto/update-prompt.dto` 3, `../executor/ai-task-executor` 3, `./prompt-strategy.factory` 3, `./modals/ArchiveWorkflowConfirmationModal` 3, `./modals/DeleteTaskConfirmationModal` 3, `../../domain/entities/agent.entity` 3 |
| workspace | 0 | 0 | 42 | 33 | not-installed 42 | `@nexus/types/public-api-v1` 33, `@nexus/prisma/client` 9 |
| absent | 0 | 0 | 48 | 4 | not-installed 48 | `src/_common/prisma/prisma.service` 6, `mdast` 5, `@nexus/ui` 3, `@/common/api-client/aitasks.service` 3, `@/common/api-client/workflow.service` 3, `@/common/components/Button` 3, `@/common/components/UI/DropdownMenu/dropdown-menu` 3, `@/common/icons/LegacyIcon` 3 |
| relative (generated) | 0 | 0 | 180 | 0 |  | `../../generated/prisma-enums` 69, `../../../generated/prisma-enums` 41, `../../../../generated/prisma-enums` 30, `../../../../../generated/prisma-enums` 17, `../../../generated/prisma-models` 13, `../generated/prisma-enums` 7, `../generated/prisma-models` 1, `../generated/admin-resource-keys` 1 |

Tsconfigs whose `extends` did not read:

- `apps/frontend/tsconfig.json`: File '@nexus/config/tsconfig.base.json' not found.

### langchainjs

Root: `<W>/census/repos/langchainjs`. Lockfile: `<W>/census/repos/langchainjs/pnpm-lock.yaml`. Findings: 2478. Units with at least one: 952.

| Kind | Units (any finding) | Units (first finding) | Findings | Under a tsconfig whose extends was lost | Package state | Top names |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| global-lib | 924 | 924 | 1278 | 1241 |  | `Promise` 869, `Set` 118, `AsyncGenerator` 81, `Map` 63, `AsyncIterable` 60, `__PKG_VERSION__` 37, `console` 27, `Iterable` 4 |
| global-node | 43 | 22 | 175 | 152 |  | `process` 135, `Buffer` 31, `NodeJS` 4, `__dirname` 2, `require` 2, `module` 1 |
| lockfile | 8 | 6 | 587 | 502 | not-installed 587 | `zod/v3` 98, `zod` 46, `@langchain/langgraph` 43, `vitest/config` 37, `openai` 35, `@anthropic-ai/sdk` 20, `zod/v4` 16, `redis` 13 |
| builtin | 4 | 0 | 97 | 88 |  | `node:fs/promises` 33, `fs` 17, `node:path` 10, `path` 9, `node:fs` 5, `assert` 5, `fs/promises` 3, `stream` 3 |
| workspace | 0 | 0 | 19 | 10 | not-installed 19 | `@langchain/core/prompts` 4, `@langchain/core/documents` 3, `@langchain/core/tools` 3, `@langchain/core/output_parsers` 3, `@langchain/core/dist/utils/types/zod.js` 3, `@langchain/core/language_models/profile` 2, `@langchain/core/utils/testing` 1 |
| root-dir | 0 | 0 | 300 | 294 |  | `(none)` 300 |
| absent | 0 | 0 | 12 | 7 | not-installed 12 | `@langchain/eslint` 7, `next/app` 1, `next/document` 1, `next/server` 1, `next` 1, `next/head` 1 |
| alias | 0 | 0 | 2 | 0 |  | `@/styles/Home.module.css` 1, `react` 1 |
| relative | 0 | 0 | 2 | 0 |  | `./typescript.svg` 1, `/vite.svg` 1 |
| member | 0 | 0 | 6 | 6 | not-installed 6 | `"@langchain/core/messages"` 3, `"@langchain/core/stores"` 2, `@langchain/core/messages` 1 |

Tsconfigs whose `extends` did not read:

- `environment_tests/test-exports-bun/tsconfig.json`: File '@tsconfig/recommended' not found.
- `environment_tests/test-exports-cjs/tsconfig.json`: File '@tsconfig/recommended' not found.
- `environment_tests/test-exports-esbuild/tsconfig.json`: File '@tsconfig/recommended' not found.
- `environment_tests/test-exports-esm/tsconfig.json`: File '@tsconfig/recommended' not found.
- `environment_tests/test-exports-node-classic/tsconfig.json`: File '@tsconfig/recommended' not found.
- `examples/tsconfig.json`: File '@langchain/tsconfig/base.json' not found.
- `internal/test-helpers/tsconfig.json`: File '@langchain/tsconfig/base.json' not found.
- `libs/create-langchain-integration/tsconfig.json`: File '@langchain/tsconfig/base.json' not found.
- `libs/create-langchain-integration/template/tsconfig.json`: File '@tsconfig/recommended' not found.
- `libs/langchain/tsconfig.json`: File '@langchain/tsconfig/base.json' not found.
- `libs/langchain-classic/tsconfig.json`: File '@langchain/tsconfig/base.json' not found.
- `libs/langchain-mcp-adapters/examples/tsconfig.json`: File '@langchain/tsconfig/base.json' not found.
- `libs/langchain-mcp-adapters/tsconfig.json`: File '@langchain/tsconfig/base.json' not found.
- `libs/langchain-textsplitters/tsconfig.json`: File '@langchain/tsconfig/base.json' not found.
- `libs/providers/langchain-anthropic/tsconfig.json`: File '@langchain/tsconfig/base.json' not found.
- `libs/providers/langchain-aws/tsconfig.json`: File '@langchain/tsconfig/base.json' not found.
- `libs/providers/langchain-cloudflare/tsconfig.json`: File '@langchain/tsconfig/base.json' not found.
- `libs/providers/langchain-cohere/tsconfig.json`: File '@langchain/tsconfig/base.json' not found.
- `libs/providers/langchain-deepseek/tsconfig.json`: File '@langchain/tsconfig/base.json' not found.
- `libs/providers/langchain-exa/tsconfig.json`: File '@langchain/tsconfig/base.json' not found.
- `libs/providers/langchain-fireworks/tsconfig.json`: File '@langchain/tsconfig/base.json' not found.
- `libs/providers/langchain-google/tsconfig.json`: File '@tsconfig/recommended' not found.
- `libs/providers/langchain-google-common/tsconfig.json`: File '@langchain/tsconfig/base.json' not found.
- `libs/providers/langchain-google-gauth/tsconfig.json`: File '@langchain/tsconfig/base.json' not found.
- `libs/providers/langchain-google-genai/tsconfig.json`: File '@langchain/tsconfig/base.json' not found.
- `libs/providers/langchain-google-vertexai/tsconfig.json`: File '@langchain/tsconfig/base.json' not found.
- `libs/providers/langchain-google-vertexai-web/tsconfig.json`: File '@langchain/tsconfig/base.json' not found.
- `libs/providers/langchain-google-webauth/tsconfig.json`: File '@langchain/tsconfig/base.json' not found.
- `libs/providers/langchain-groq/tsconfig.json`: File '@langchain/tsconfig/base.json' not found.
- `libs/providers/langchain-ibm/tsconfig.json`: File '@langchain/tsconfig/base.json' not found.
- `libs/providers/langchain-mistralai/tsconfig.json`: File '@langchain/tsconfig/base.json' not found.
- `libs/providers/langchain-mongodb/tsconfig.json`: File '@langchain/tsconfig/base.json' not found.
- `libs/providers/langchain-neo4j/tsconfig.json`: File '@langchain/tsconfig/base.json' not found.
- `libs/providers/langchain-ollama/tsconfig.json`: File '@langchain/tsconfig/base.json' not found.
- `libs/providers/langchain-openai/tsconfig.json`: File '@langchain/tsconfig/base.json' not found.
- `libs/providers/langchain-openrouter/tsconfig.json`: File '@langchain/tsconfig/base.json' not found.
- `libs/providers/langchain-perplexity/tsconfig.json`: File '@langchain/tsconfig/base.json' not found.
- `libs/providers/langchain-pgvector/tsconfig.json`: File '@langchain/tsconfig/base.json' not found.
- `libs/providers/langchain-pinecone/tsconfig.json`: File '@langchain/tsconfig/base.json' not found.
- `libs/providers/langchain-qdrant/tsconfig.json`: File '@langchain/tsconfig/base.json' not found.
- `libs/providers/langchain-redis/tsconfig.json`: File '@langchain/tsconfig/base.json' not found.
- `libs/providers/langchain-tavily/tsconfig.json`: File '@langchain/tsconfig/base.json' not found.
- `libs/providers/langchain-together-ai/tsconfig.json`: File '@langchain/tsconfig/base.json' not found.
- `libs/providers/langchain-typesafe/tsconfig.json`: File '@langchain/tsconfig/base.json' not found.
- `libs/providers/langchain-weaviate/tsconfig.json`: File '@langchain/tsconfig/base.json' not found.
- `libs/providers/langchain-xai/tsconfig.json`: File '@langchain/tsconfig/base.json' not found.
