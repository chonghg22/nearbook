import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator'

export class CreateAnalyticsEventDto {
  @IsString()
  @MaxLength(32)
  type!: string

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>

  @IsOptional()
  @IsString()
  @MaxLength(64)
  sessionId?: string

  @IsOptional()
  @IsString()
  @MaxLength(256)
  pathname?: string

  @IsOptional()
  @IsString()
  @MaxLength(512)
  search?: string

  @IsOptional()
  @IsString()
  @MaxLength(64)
  at?: string
}
