import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class Verify2FADTO {
  @ApiProperty({ example: '123456', description: '6-digit TOTP code from authenticator app' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'TOTP code must be 6 digits' })
  code!: string;
}
