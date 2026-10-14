import {
  IsString, IsOptional, IsInt,
  Min, Max, IsIn, MinLength, MaxLength,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { SEARCH_TYPES, type SearchType } from '@nearbook/shared-types'

export class SearchQueryDto {
  @ApiProperty({ description: '검색어' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  q: string

  @ApiPropertyOptional({ enum: SEARCH_TYPES, default: 'all' })
  @IsOptional()
  @IsIn(SEARCH_TYPES)
  searchType?: SearchType = 'all'

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string

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

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number = 10
}
