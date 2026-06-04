import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator'

export class AdminLoginDto {
  @IsEmail()
  @MaxLength(256)
  email!: string

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string
}
