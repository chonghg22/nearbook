import { IsBoolean, IsIn, IsOptional } from 'class-validator'

export class UpdatePrefDto {
  @IsOptional()
  @IsBoolean()
  emailOnAvailable?: boolean

  @IsOptional()
  @IsIn(['daily', 'weekly'])
  digestFrequency?: 'daily' | 'weekly'
}
