import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class ListEventProgramsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number

  @IsOptional()
  @IsIn(['draft', 'published', 'closed', 'cancelled'])
  status?: string
}
