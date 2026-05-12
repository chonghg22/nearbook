import {
  IsString, IsOptional, IsInt, IsBoolean,
  Min, Max, IsIn,
} from 'class-validator'
import { Type, Transform } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class SearchQueryDto {
  @ApiProperty({ description: '검색어' })
  @IsString()
  q: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  libraryId?: number

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  availableOnly?: boolean = false

  @ApiPropertyOptional({ enum: ['relevance', 'popular', 'recent'] })
  @IsOptional()
  @IsIn(['relevance', 'popular', 'recent'])
  sort?: 'relevance' | 'popular' | 'recent' = 'relevance'

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
  @Max(50)
  pageSize?: number = 20

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  regionSlug?: string

  @ApiPropertyOptional({ description: '위도 (도서관 매칭용)' })
  @IsOptional()
  @Type(() => Number)
  lat?: number

  @ApiPropertyOptional({ description: '경도 (도서관 매칭용)' })
  @IsOptional()
  @Type(() => Number)
  lng?: number

  @ApiPropertyOptional({ description: '내 도서관 우선 정렬 (default: true)' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true || value === '1')
  @IsBoolean()
  personalize?: boolean = true
}
