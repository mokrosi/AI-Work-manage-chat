import { IsBoolean, IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class ConfirmApprovalDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsBoolean()
  approve!: boolean;
}

export class EditApprovalDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsDateString()
  startTime!: string;

  @IsDateString()
  endTime!: string;
}