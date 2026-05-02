import { IsInt, IsOptional, IsString, MaxLength, IsBoolean } from 'class-validator'
import { Type } from 'class-transformer'

export class AddLibraryCardDto {
  @IsInt()
  @Type(() => Number)
  libraryId: number

  @IsOptional()
  @IsString()
  @MaxLength(64)
  nickname?: string
}

export class UpdateLibraryCardDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  nickname?: string

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean
}
