import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateText, tool, isStepCount } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import {
  ILlmGateway,
  LlmRunInput,
  LlmRunResult,
  LlmToolResult,
} from '@application/ports/llm.port';
import { ApplicationError } from '@application/errors/application.error';

const DEFAULT_OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_MODEL = 'google/gemini-1.5-flash:free';

export function getOpenRouterHeaders(
  overrides: Record<string, string | undefined> = {},
): Record<string, string> {
  return {
    'HTTP-Referer':
      overrides['HTTP-Referer'] ??
      overrides.HTTP_REFERER ??
      'http://localhost:3000',
    'X-Title': overrides['X-Title'] ?? overrides.APP_TITLE ?? 'AI Task Manager',
  };
}

export function resolveModelConfig(
  env: Record<string, string | undefined> = process.env,
): {
  apiKey?: string;
  modelId: string;
  baseUrl: string;
  headers: Record<string, string>;
  maxToolSteps: number;
  timeoutMs: number;
} {
  const apiKey = env.OPENROUTER_API_KEY ?? env.OPENAI_API_KEY;
  const modelId = env.OPENROUTER_MODEL ?? env.OPENAI_MODEL ?? DEFAULT_MODEL;
  const baseUrl = env.OPENROUTER_BASE_URL ?? DEFAULT_OPENROUTER_BASE_URL;
  const headers = getOpenRouterHeaders({
    'HTTP-Referer': env.OPENROUTER_HTTP_REFERER,
    'X-Title': env.OPENROUTER_APP_TITLE,
  });

  const maxToolSteps = Math.max(
    1,
    Number.parseInt(env.OPENROUTER_MAX_TOOL_STEPS ?? '3', 10) || 3,
  );
  const timeoutMs = Math.max(
    5_000,
    Number.parseInt(env.OPENROUTER_TIMEOUT_MS ?? '30000', 10) || 30_000,
  );

  return { apiKey, modelId, baseUrl, headers, maxToolSteps, timeoutMs };
}

export function buildRuntimeContext(now = new Date(), timezone = 'UTC') {
  const dayOfWeek = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long',
  }).format(now);

  return {
    timestampIso: now.toISOString(),
    timezone,
    dayOfWeek,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withBackoffRetry<T>(
  action: () => Promise<T>,
  retries: number,
  timeoutMs: number,
  baseDelayMs: number,
): Promise<T> {
  let attempt = 0;

  while (true) {
    try {
      return await new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`Request timed out after ${timeoutMs}ms`));
        }, timeoutMs);

        Promise.resolve(action())
          .then((value) => {
            clearTimeout(timer);
            resolve(value);
          })
          .catch((error) => {
            clearTimeout(timer);
            reject(error);
          });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isRetriable = /429|5\d\d|timeout|rate limit|temporar/i.test(message);

      if (!isRetriable || attempt >= retries) {
        throw error;
      }

      attempt += 1;
      await delay(baseDelayMs * 2 ** (attempt - 1));
    }
  }
}

@Injectable()
export class OpenAiGateway implements ILlmGateway {
  private readonly apiKey?: string;
  private readonly modelId: string;
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;
  private readonly maxToolSteps: number;
  private readonly timeoutMs: number;

  constructor(config: ConfigService) {
    const resolved = resolveModelConfig({
      OPENROUTER_API_KEY: config.get<string>('OPENROUTER_API_KEY'),
      OPENAI_API_KEY: config.get<string>('OPENAI_API_KEY'),
      OPENROUTER_MODEL: config.get<string>('OPENROUTER_MODEL'),
      OPENAI_MODEL: config.get<string>('OPENAI_MODEL'),
      OPENROUTER_BASE_URL: config.get<string>('OPENROUTER_BASE_URL'),
      OPENROUTER_HTTP_REFERER: config.get<string>('OPENROUTER_HTTP_REFERER'),
      OPENROUTER_APP_TITLE: config.get<string>('OPENROUTER_APP_TITLE'),
      OPENROUTER_MAX_TOOL_STEPS: config.get<string>('OPENROUTER_MAX_TOOL_STEPS'),
      OPENROUTER_TIMEOUT_MS: config.get<string>('OPENROUTER_TIMEOUT_MS'),
    });

    this.apiKey = resolved.apiKey;
    this.modelId = resolved.modelId;
    this.baseUrl = resolved.baseUrl;
    this.headers = resolved.headers;
    this.maxToolSteps = resolved.maxToolSteps;
    this.timeoutMs = resolved.timeoutMs;
  }

  async run(input: LlmRunInput): Promise<LlmRunResult> {
    if (!this.apiKey) {
      throw new ApplicationError(
        'AI_NOT_CONFIGURED',
        'OpenRouter API key is not configured in the backend environment',
      );
    }

    const openrouter = createOpenAI({
      apiKey: this.apiKey,
      baseURL: this.baseUrl,
      headers: this.headers,
    });
    const model = openrouter(this.modelId as never);

    const records: LlmToolResult[] = [];

    const toolSet = Object.fromEntries(
      input.tools.map((t) => [
        t.name,
        tool({
          description: t.description,
          inputSchema: t.inputSchema as any,
          execute: async (args: any) => {
            const output = await t.execute(args);
            records.push({ name: t.name, args, output });
            return typeof output === 'string' ? output : JSON.stringify(output);
          },
        }),
      ]),
    );

    const maxSteps = Math.max(
      1,
      Math.min(input.maxSteps ?? this.maxToolSteps, this.maxToolSteps),
    );

    const result = await withBackoffRetry(
      () =>
        generateText({
          model,
          instructions: input.system,
          prompt: input.prompt,
          tools: toolSet as any,
          stopWhen: isStepCount(maxSteps),
        }),
      3,
      this.timeoutMs,
      750,
    );

    return { text: result.text, toolResults: records };
  }
}