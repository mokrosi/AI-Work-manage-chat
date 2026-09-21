import { Module } from '@nestjs/common';
import { ILlmGateway } from '@application/ports/llm.port';
import { OpenAiGateway } from './openai-gateway';

@Module({
  providers: [
    {
      provide: ILlmGateway,
      useClass: OpenAiGateway,
    },
  ],
  exports: [ILlmGateway],
})
export class AiModule {}
