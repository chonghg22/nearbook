import { IsIn, IsString } from 'class-validator'

export class UpdateFeedbackStatusDto {
  @IsString()
  @IsIn(['pending', 'in_review', 'resolved', 'archived'])
  status!: 'pending' | 'in_review' | 'resolved' | 'archived'
}
