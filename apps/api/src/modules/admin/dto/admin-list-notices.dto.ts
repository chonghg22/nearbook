import { Type } from 'class-transformer'
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator'
import { PaginationQueryDto } from './pagination-query.dto'

export class AdminListNoticesDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(['general', 'update', 'maintenance'])
  category?: 'general' | 'update' | 'maintenance'

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPublished?: boolean
}
