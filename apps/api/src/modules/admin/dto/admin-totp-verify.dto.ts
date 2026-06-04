import { IsString, Length, MinLength } from 'class-validator'

export class AdminTotpVerifyDto {
  @IsString()
  @MinLength(10)
  ticket!: string

  @IsString()
  @Length(6, 6)
  code!: string
}
