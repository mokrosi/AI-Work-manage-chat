import { Global, Module } from '@nestjs/common';
import { ITaskRepository } from '@domain/repositories/task.repository.interface';
import { PrismaTaskRepository } from './prisma-task.repository';
import { PrismaService } from './prisma.service';
import { DefaultUserService } from './default-user.service';

/**
 * Global Infrastructure DB module. Exposes PrismaService to every module.
 */
@Global()
@Module({
  providers: [
    PrismaService,
    PrismaTaskRepository,
    DefaultUserService,
    {
      provide: ITaskRepository,
      useExisting: PrismaTaskRepository,
    },
  ],
  exports: [PrismaService, ITaskRepository, DefaultUserService],
})
export class DatabaseModule {}
