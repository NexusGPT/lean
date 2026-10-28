/**
 * Knowledge Placeholder Utilities
 *
 * Shared utilities for handling knowledge placeholders in AI prompts.
 * Placeholders use the format {{collectionName}} for RAG (Retrieval-Augmented Generation).
 *
 * Used by both frontend (TipTap editor) and backend (runtime RAG).
 */

import type { JSONContent } from "@tiptap/core";

import { PROMPT_NODE_NAMES } from "./agent-prompt.constants";

/**
 * Regular expression to match knowledge placeholders {{name}}
 *
 * Pattern explanation:
 * - \{\{ - Opening double braces (escaped)
 * - ([^}]+) - Capture group: one or more characters that are NOT closing braces
 * - \}\} - Closing double braces (escaped)
 * - g flag - Global (find all matches)
 * - i flag - Case-insensitive
 */
export const KNOWLEDGE_PLACEHOLDER_REGEX = /\{\{([^}]+)\}\}/gi;

/**
 * Non-global version for single match operations
 *
 * Use this for `test()` and single `match()` calls to avoid state issues.
 */
export const KNOWLEDGE_PLACEHOLDER_REGEX_SINGLE = /\{\{([^}]+)\}\}/i;

/**
 * Knowledge value types supported by the system
 */
export type KnowledgeType = "collection";

/**
 * Knowledge value structure matching frontend/backend schema
 */
export interface KnowledgeValue {
  /** Human-readable collection name */
  name: string;
  /** Contains placeholder like "{{collectionName}}" or additional context */
  content: string;
  /** Type of knowledge (always "collection" after migration) */
  type: KnowledgeType;
  /** Optional description for UI display */
  description?: string;
}

/**
 * Represents a single placeholder match
 */
export interface PlaceholderMatch {
  /** The full placeholder string including braces, e.g., "{{collectionName}}" */
  placeholder: string;
  /** The extracted name without braces, e.g., "collectionName" */
  name: string;
}

/**
 * Result of extracting placeholders from text
 */
export interface ExtractPlaceholdersResult {
  /** Array of all placeholder matches found */
  matches: PlaceholderMatch[];
  /** Set of unique placeholder names (for deduplication) */
  uniqueNames: Set<string>;
  /** Total count of placeholders (including duplicates) */
  totalCount: number;
}

/**
 * Options for placeholder replacement
 */
export interface ReplacePlaceholdersOptions {
  /** What to replace invalid/missing placeholders with (default: "") */
  fallbackText?: string;
  /** Whether to preserve unmatched placeholders or remove them (default: false) */
  preserveUnmatched?: boolean;
}

/**
 * Formats a name into a placeholder string
 *
 * @param name - The collection/knowledge name
 * @returns The formatted placeholder string with braces
 *
 * @example
 * formatKnowledgePlaceholder("collectionName") // "{{collectionName}}"
 */
export function formatKnowledgePlaceholder(name: string): string {
  return `{{${name}}}`;
}

/**
 * Extracts all placeholder matches from a string
 *
 * @param text - The text to search for placeholders
 * @returns Object containing matches, unique names, and total count
 *
 * @example
 * const result = extractKnowledgePlaceholders("Use {{docs}} and {{faq}}")
 * // result.matches.length === 2
 * // result.uniqueNames.size === 2
 */
export function extractKnowledgePlaceholders(text: string): ExtractPlaceholdersResult {
  const matches: PlaceholderMatch[] = [];
  const uniqueNames = new Set<string>();

  // Create a fresh regex instance to avoid state issues
  const regex = new RegExp(KNOWLEDGE_PLACEHOLDER_REGEX.source, KNOWLEDGE_PLACEHOLDER_REGEX.flags);
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const placeholder = match[0];
    const name = match[1] ?? "";

    if (!name) continue;

    matches.push({ placeholder, name });
    uniqueNames.add(name);
  }

  return {
    matches,
    uniqueNames,
    totalCount: matches.length
  };
}

/**
 * Checks if text contains any placeholders
 */
export function hasKnowledgePlaceholders(text: string): boolean {
  return KNOWLEDGE_PLACEHOLDER_REGEX_SINGLE.test(text);
}

/**
 * Validates if a string is a valid placeholder
 */
export function isValidKnowledgePlaceholder(text: string): boolean {
  const regex = new RegExp(`^${KNOWLEDGE_PLACEHOLDER_REGEX_SINGLE.source}$`, "i");
  return regex.test(text) && text.length > 4;
}

/**
 * Extracts the name from a placeholder string
 *
 * @param placeholder - The placeholder string (e.g., "{{name}}")
 * @returns The extracted name or null if invalid
 */
export function extractKnowledgePlaceholderName(placeholder: string): string | null {
  const match = placeholder.match(KNOWLEDGE_PLACEHOLDER_REGEX_SINGLE);
  if (!match || !match[1] || match[1].trim().length === 0) {
    return null;
  }
  return match[1];
}

/**
 * Replaces all placeholders in text using a replacement map
 *
 * @param text - The text containing placeholders
 * @param replacementMap - Map of placeholder names to replacement values
 * @param options - Options for handling edge cases
 * @returns The text with placeholders replaced
 */
export function replaceKnowledgePlaceholders(
  text: string,
  replacementMap: Map<string, string>,
  options: ReplacePlaceholdersOptions = {}
): string {
  const { fallbackText = "", preserveUnmatched = false } = options;

  const extracted = extractKnowledgePlaceholders(text);
  if (extracted.totalCount === 0) {
    return text;
  }

  let result = text;

  for (const name of Array.from(extracted.uniqueNames)) {
    const placeholder = formatKnowledgePlaceholder(name);
    const replacement = replacementMap.get(name);

    if (replacement !== undefined) {
      result = result.split(placeholder).join(replacement);
    } else if (!preserveUnmatched) {
      result = result.split(placeholder).join(fallbackText);
    }
  }

  return result;
}

/**
 * Sanitizes a collection name to be safe for use in placeholders
 */
export function sanitizeKnowledgePlaceholderName(name: string): string {
  return name.replace(/[{}]/g, "").trim();
}

/**
 * Extract unique collection names from {{name}} placeholders in a prompt.
 */
export function extractUniqueCollectionNames(prompt: string): string[] {
  const { matches } = extractKnowledgePlaceholders(prompt);
  if (matches.length === 0) return [];
  return [...new Set(matches.map((match) => match.name))];
}

/**
 * Recursively traverses TipTap JSON content to find collection mention nodes.
 *
 * Returns every collection name the author placed in the prompt, regardless of
 * the stored `isActive` / `isNotFound` flags. Those flags are baked at
 * parse time and never reconciled with the agent's live collection list, so
 * acting on them here would silently skip a collection at RAG extraction time
 * even though the renderer (post-PR #928) now flows it through to the prompt.
 * That mismatch would emit "[Collection not available]" into the LLM prompt
 * — a new failure mode replacing the previous silent drop.
 *
 * The caller's live collection list is the source of truth for what gets
 * searched; this function's job is just to surface every name the author
 * referenced so the orchestrator can decide.
 */
function traverseJsonForCollections(node: JSONContent | null, collectionNames: Set<string>): void {
  if (!node) return;

  if (node.type === PROMPT_NODE_NAMES.COLLECTION_MENTION) {
    const name = node.attrs?.name;
    if (name && typeof name === "string") {
      collectionNames.add(name);
    }
  }

  if (node.content && Array.isArray(node.content)) {
    for (const child of node.content) {
      traverseJsonForCollections(child, collectionNames);
    }
  }
}

/**
 * Extracts unique collection names directly from TipTap JSON structure.
 *
 * @param json - TipTap JSONContent structure
 * @returns Array of unique collection names mentioned in the prompt
 */
export function extractCollectionNamesFromJson(json: JSONContent | null): string[] {
  if (!json) return [];

  const collectionNames = new Set<string>();
  traverseJsonForCollections(json, collectionNames);

  return Array.from(collectionNames);
}
