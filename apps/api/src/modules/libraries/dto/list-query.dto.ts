import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class ListQueryDto {
  @ApiPropertyOptional({ description: '도서관 이름 검색' })
  @IsOptional()
  @IsString()
  q?: string

  @ApiPropertyOptional({ description: '지역 필터 (시도 구군)' })
  @IsOptional()
  @IsString()
  region?: string

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20
}
