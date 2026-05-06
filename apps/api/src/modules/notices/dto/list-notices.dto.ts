import { IsOptional, IsString, IsInt, Min, Max, IsIn } from 'class-validator'
import { Type } from 'class-transformer'

export class ListNoticesDto {
  @IsOptional()
  @IsString()
  @IsIn(['general', 'update', 'maintenance'])
  category?: 'general' | 'update' | 'maintenance'

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number = 20
}
