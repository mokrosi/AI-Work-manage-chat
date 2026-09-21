import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class ConfirmApprovalDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsBoolean()
  approve!: boolean;
}