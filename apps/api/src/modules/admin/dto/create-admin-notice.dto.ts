import { Type } from 'class-transformer'
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class CreateAdminNoticeDto {
  @IsString()
  @MinLength(2)
  @MaxLength(256)
  title!: string

  @IsString()
  @MinLength(5)
  @MaxLength(20000)
  content!: string

  @IsOptional()
  @IsString()
  @IsIn(['general', 'update', 'maintenance'])
  category?: 'general' | 'update' | 'maintenance'

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPinned?: boolean

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPublished?: boolean
}
