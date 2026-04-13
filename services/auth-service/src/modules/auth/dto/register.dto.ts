import { IsString, IsEnum, IsOptional, Matches, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Country } from '@mondega/shared-types';

export class RegisterDTO {
  @ApiProperty({ example: '+50212345678', description: 'Phone in E.164 format' })
  @IsString()
  @Matches(/^\+[1-9]\d{7,14}$/, { message: 'Phone must be in E.164 format (e.g. +50212345678)' })
  phoneNumber!: string;

  @ApiProperty({ enum: Country, example: Country.GT })
  @IsEnum(Country)
  country!: Country;

  @ApiProperty({ example: '123456', description: '6-digit numeric PIN' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'PIN must be exactly 6 digits' })
  pin!: string;

  @ApiPropertyOptional({ example: 'ABC12345', description: 'Referral code from existing user' })
  @IsOptional()
  @IsString()
  @Length(8, 8)
  referralCode?: string;
}
