import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Task } from '@domain/entities/task.entity';
import { DefaultUserService } from '@infrastructure/database/default-user.service';
import {
  CreateTaskUseCase,
  DeleteTaskUseCase,
  GetScheduleUseCase,
  UpdateTaskUseCase,
} from '@application/use-cases/task.use-cases';
import { CreateTaskDto } from '../dtos/create-task.dto';
import { UpdateTaskDto } from '../dtos/update-task.dto';
import { ScheduleQueryDto } from '../dtos/schedule-query.dto';

@Controller('tasks')
export class TasksController {
  constructor(
    private readonly getSchedule: GetScheduleUseCase,
    private readonly createTask: CreateTaskUseCase,
    private readonly updateTask: UpdateTaskUseCase,
    private readonly deleteTask: DeleteTaskUseCase,
    private readonly defaultUser: DefaultUserService,
  ) {}

  @Get()
  async list(@Query() query: ScheduleQueryDto): Promise<Task[]> {
    const userId = await this.defaultUser.resolveId(query.userId);
    const timezone = query.timezone ?? 'UTC';

    let start: Date;
    let end: Date;

    if (query.from && query.to) {
      start = new Date(query.from);
      end = new Date(query.to);
    } else {
      const now = new Date();
      start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    }

    return this.getSchedule.execute({ userId, start, end, timezone });
  }

  @Post()
  async create(@Body() dto: CreateTaskDto): Promise<Task> {
    const userId = await this.defaultUser.resolveId(dto.userId);
    return this.createTask.execute({
      title: dto.title,
      description: dto.description,
      startTime: new Date(dto.startTime),
      endTime: new Date(dto.endTime),
      status: dto.status,
      userId,
      timezone: dto.timezone ?? 'UTC',
    });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTaskDto): Promise<Task> {
    const userId = await this.defaultUser.resolveId();
    return this.updateTask.execute({
      id,
      userId,
      timezone: dto.timezone ?? 'UTC',
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.startTime !== undefined && { startTime: new Date(dto.startTime) }),
      ...(dto.endTime !== undefined && { endTime: new Date(dto.endTime) }),
      ...(dto.status !== undefined && { status: dto.status }),
    });
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Query('userId') userId?: string,
  ): Promise<Task> {
    const resolvedUserId = await this.defaultUser.resolveId(userId);
    return this.deleteTask.execute({ id, userId: resolvedUserId, timezone: 'UTC' });
  }
}