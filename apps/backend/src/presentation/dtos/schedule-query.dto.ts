import { IsDateString, IsOptional, IsString } from 'class-validator';

export class ScheduleQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}