import { IsString, MinLength } from 'class-validator'

export class AdminTotpTicketDto {
  @IsString()
  @MinLength(10)
  ticket!: string
}
