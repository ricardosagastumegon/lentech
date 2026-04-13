import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePINDTO {
  @ApiProperty({ example: '123456' })
  @IsString()
  @Matches(/^\d{6}$/)
  currentPin!: string;

  @ApiProperty({ example: '654321' })
  @IsString()
  @Matches(/^\d{6}$/)
  newPin!: string;
}
