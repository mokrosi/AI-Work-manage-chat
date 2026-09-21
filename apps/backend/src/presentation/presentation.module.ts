import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ApplicationModule } from '@application/application.module';
import { HealthController } from './controllers/health.controller';
import { TasksController } from './controllers/tasks.controller';
import { ChatController } from './controllers/chat.controller';
import { GlobalExceptionFilter } from './filters/global-exception.filter';

@Module({
  imports: [ApplicationModule],
  controllers: [HealthController, TasksController, ChatController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class PresentationModule {}