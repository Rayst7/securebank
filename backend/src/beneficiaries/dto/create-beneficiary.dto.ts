import {
  IsString,
  IsNotEmpty,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateBeneficiaryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  alias!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  @Matches(/^[A-Za-z0-9-]+$/, {
    message: 'El número de cuenta contiene caracteres no permitidos',
  })
  accountNumber!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  bankName!: string;
}

