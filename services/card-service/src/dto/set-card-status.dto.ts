import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetCardStatusDTO {
  @ApiProperty({ enum: ['freeze', 'unfreeze'] })
  @IsEnum(['freeze', 'unfreeze'])
  action!: 'freeze' | 'unfreeze';
}
