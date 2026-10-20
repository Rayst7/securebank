import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsNumber,
  IsPositive,
  IsOptional,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTransferDto {
  @IsUUID()
  sourceAccountId!: string;

  @IsUUID()
  destinationAccountId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(0.01)
  @Max(1000000)
  amount!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  idempotencyKey!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}