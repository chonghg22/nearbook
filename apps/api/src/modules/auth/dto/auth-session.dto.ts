import { IsString, IsUrl, Matches, MaxLength, MinLength } from 'class-validator'

export class KakaoSessionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  code!: string

  @IsUrl({ require_tld: false, require_protocol: true, protocols: ['http', 'https'] })
  @MaxLength(512)
  redirectUri!: string
}

export class RefreshTokenDto {
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{43}$/)
  refreshToken!: string
}
