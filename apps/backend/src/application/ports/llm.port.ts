import { z } from 'zod';

/**
 * Abstraction over the LLM provider. The Application layer depends on this
 * port instead of a concrete AI SDK so it can be swapped (OpenAI, Anthropic,
 * local model, etc.) without touching business logic.
 */
export interface LlmTool {
  name: string;
  description: string;
  inputSchema: z.ZodType;
  /** Executes the tool. Return a string or a JSON-serializable object. */
  execute: (args: unknown) => Promise<unknown>;
}

export interface LlmToolResult {
  name: string;
  args: unknown;
  output: unknown;
}

export interface LlmRunInput {
  system: string;
  prompt: string;
  tools: LlmTool[];
  maxSteps?: number;
}

export interface LlmRunResult {
  text: string;
  toolResults: LlmToolResult[];
}

export const ILlmGateway = Symbol('ILlmGateway');

export interface ILlmGateway {
  run(input: LlmRunInput): Promise<LlmRunResult>;
}
