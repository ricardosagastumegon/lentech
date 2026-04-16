import { IsString, IsNumber, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

class PomeloAmountDetail {
  @IsNumber() total!: number;
  @IsString() currency!: string;
}

class PomeloAmount {
  @ValidateNested() @Type(() => PomeloAmountDetail) local!: PomeloAmountDetail;
  @ValidateNested() @Type(() => PomeloAmountDetail) transaction!: PomeloAmountDetail;
}

class PomeloMerchant {
  @IsString() @IsNotEmpty() name!: string;
  @IsString() mcc!: string;
  @IsString() country!: string;
}

export class PomeloAuthWebhookDTO {
  @IsString() @IsNotEmpty() id!: string;
  @IsString() @IsNotEmpty() card_id!: string;
  @IsString() status!: string;
  @ValidateNested() @Type(() => PomeloAmount) amount!: PomeloAmount;
  @ValidateNested() @Type(() => PomeloMerchant) merchant!: PomeloMerchant;
}
