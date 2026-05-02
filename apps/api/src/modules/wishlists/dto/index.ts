import { IsString, Matches, IsOptional, MaxLength } from 'class-validator'

export class AddWishlistDto {
  @IsString()
  @Matches(/^\d{10,13}$/, { message: 'isbn must be 10 or 13 digits' })
  isbn: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string
}

export class UpdateWishlistDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string
}
