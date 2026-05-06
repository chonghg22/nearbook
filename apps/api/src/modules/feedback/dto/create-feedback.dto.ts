import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class CreateFeedbackDto {
  @IsString()
  @IsIn(['bug', 'suggestion', 'other'])
  category!: 'bug' | 'suggestion' | 'other'

  @IsString()
  @MinLength(2)
  @MaxLength(256)
  title!: string

  @IsString()
  @MinLength(5)
  @MaxLength(4000)
  body!: string

  @IsOptional()
  @IsEmail()
  @MaxLength(256)
  contactEmail?: string

  @IsOptional()
  @IsString()
  @MaxLength(512)
  pageUrl?: string
}
