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

@Injectable()
export class OpenAiGateway implements ILlmGateway {
  private readonly apiKey?: string;
  private readonly modelId: string;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('OPENAI_API_KEY');
    this.modelId = config.get<string>('OPENAI_MODEL', 'gpt-4o-mini');
  }

  async run(input: LlmRunInput): Promise<LlmRunResult> {
    if (!this.apiKey) {
      throw new ApplicationError(
        'AI_NOT_CONFIGURED',
        'OPENAI_API_KEY is not configured in the backend environment',
      );
    }

    const openai = createOpenAI({ apiKey: this.apiKey });
    const model = openai(this.modelId as never);

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

    const result = await generateText({
      model,
      instructions: input.system,
      prompt: input.prompt,
      tools: toolSet as any,
      stopWhen: isStepCount(input.maxSteps ?? 6),
    });

    return { text: result.text, toolResults: records };
  }
}