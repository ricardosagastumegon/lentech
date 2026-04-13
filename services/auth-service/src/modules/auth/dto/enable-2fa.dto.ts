import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class Enable2FADTO {
  @ApiPropertyOptional({ description: 'Reserved for future use' })
  @IsOptional()
  @IsString()
  deviceName?: string;
}
