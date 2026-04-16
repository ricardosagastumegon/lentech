import {
  IsString, IsEnum, IsOptional, IsNumber, Min, Max,
  ValidateNested, IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class DeliveryAddressDTO {
  @ApiProperty() @IsString() @IsNotEmpty() line1!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() line2?: string;
  @ApiProperty() @IsString() @IsNotEmpty() city!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() state?: string;
  @ApiProperty() @IsString() @IsNotEmpty() postalCode!: string;
  @ApiProperty({ example: 'MX' }) @IsString() @IsNotEmpty() country!: string;
}

export class IssueCardDTO {
  @ApiProperty({ enum: ['virtual', 'physical'] })
  @IsEnum(['virtual', 'physical'])
  type!: 'virtual' | 'physical';

  @ApiProperty({ example: 'USD' })
  @IsString() @IsNotEmpty()
  currency!: string;

  @ApiPropertyOptional({ example: 500, description: 'Daily spending limit in USD' })
  @IsOptional() @IsNumber() @Min(1) @Max(10000)
  spendingLimitDaily?: number;

  @ApiPropertyOptional({ type: DeliveryAddressDTO, description: 'Required for physical cards' })
  @IsOptional() @ValidateNested() @Type(() => DeliveryAddressDTO)
  deliveryAddress?: DeliveryAddressDTO;
}
