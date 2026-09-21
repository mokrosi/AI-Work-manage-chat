import { Module } from '@nestjs/common';
import { DatabaseModule } from '@infrastructure/database/database.module';
import { AiModule } from '@infrastructure/ai/ai.module';
import {
  CheckAvailabilityUseCase,
  CreateTaskUseCase,
  DeleteTaskUseCase,
  GetScheduleUseCase,
  UpdateTaskUseCase,
} from './use-cases/task.use-cases';
import { TaskExecutorService } from './services/task-executor.service';
import { AgentOrchestratorService } from './services/agent-orchestrator.service';
import { PendingApprovalStore } from './services/pending-approval.store';

@Module({
  imports: [DatabaseModule, AiModule],
  providers: [
    GetScheduleUseCase,
    CheckAvailabilityUseCase,
    CreateTaskUseCase,
    UpdateTaskUseCase,
    DeleteTaskUseCase,
    TaskExecutorService,
    PendingApprovalStore,
    AgentOrchestratorService,
  ],
  exports: [
    TaskExecutorService,
    AgentOrchestratorService,
    GetScheduleUseCase,
    CheckAvailabilityUseCase,
    CreateTaskUseCase,
    UpdateTaskUseCase,
    DeleteTaskUseCase,
  ],
})
export class ApplicationModule {}
