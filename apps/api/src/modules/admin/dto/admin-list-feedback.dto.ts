import { IsIn, IsOptional, IsString } from 'class-validator'
import { PaginationQueryDto } from './pagination-query.dto'

export class AdminListFeedbackDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(['bug', 'suggestion', 'other'])
  category?: 'bug' | 'suggestion' | 'other'

  @IsOptional()
  @IsString()
  @IsIn(['pending', 'in_review', 'resolved', 'archived'])
  status?: 'pending' | 'in_review' | 'resolved' | 'archived'
}
