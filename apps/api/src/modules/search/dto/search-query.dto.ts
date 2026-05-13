import {
  IsString, IsOptional, IsInt,
  Min, Max, IsIn,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class SearchQueryDto {
  @ApiProperty({ description: '검색어' })
  @IsString()
  q: string

  @ApiPropertyOptional({ enum: ['title', 'author', 'isbn', 'publisher'], default: 'title' })
  @IsOptional()
  @IsIn(['title', 'author', 'isbn', 'publisher'])
  searchType?: 'title' | 'author' | 'isbn' | 'publisher' = 'title'

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
