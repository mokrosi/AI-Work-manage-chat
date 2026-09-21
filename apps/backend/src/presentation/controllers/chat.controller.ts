import { Body, Controller, Post } from '@nestjs/common';
import { AgentOrchestratorService } from '@application/services/agent-orchestrator.service';
import { DefaultUserService } from '@infrastructure/database/default-user.service';
import { ChatMessageDto } from '../dtos/chat-message.dto';
import { ConfirmApprovalDto, EditApprovalDto } from '../dtos/confirm-approval.dto';

@Controller('chat')
export class ChatController {
  constructor(
    private readonly orchestrator: AgentOrchestratorService,
    private readonly defaultUser: DefaultUserService,
  ) {}

  @Post()
  async message(@Body() dto: ChatMessageDto) {
    const userId = await this.defaultUser.resolveId(dto.userId);
    const timezone = dto.timezone ?? 'UTC';
    return this.orchestrator.handleMessage(dto.message, timezone, userId, dto.history);
  }

  @Post('confirm')
  async confirm(@Body() dto: ConfirmApprovalDto) {
    return this.orchestrator.confirm(dto.token, dto.approve);
  }

  @Post('confirm/edit')
  edit(@Body() dto: EditApprovalDto) {
    return this.orchestrator.editApproval(dto.token, {
      title: dto.title,
      startTime: new Date(dto.startTime),
      endTime: new Date(dto.endTime),
    });
  }
}