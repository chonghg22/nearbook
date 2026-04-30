import { IsString, Matches, IsOptional, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class AddWishlistDto {
  @ApiProperty({ example: '9791162540046' })
  @IsString()
  @Matches(/^\d{10,13}$/, { message: 'ISBN은 10-13자리 숫자' })
  isbn: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string
}

export class UpdateWishlistDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string
}
