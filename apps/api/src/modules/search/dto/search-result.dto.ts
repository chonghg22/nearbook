import { ApiProperty } from '@nestjs/swagger'

export class SearchResultItemDto {
  @ApiProperty() isbn: string
  @ApiProperty() title: string
  @ApiProperty() author: string
  @ApiProperty({ nullable: true }) publisher: string | null
  @ApiProperty({ nullable: true }) coverUrl: string | null
}

export class SearchResultDto {
  @ApiProperty({ type: [SearchResultItemDto] }) items: SearchResultItemDto[]
  @ApiProperty() total: number
  @ApiProperty() page: number
  @ApiProperty() pageSize: number
  @ApiProperty() source: 'orama' | 'orama+aladdin'
  @ApiProperty() durationMs: number
  @ApiProperty({ nullable: true }) suggestions?: string[]
  @ApiProperty({ nullable: true }) trending?: string[]
  @ApiProperty() personalized: boolean
  @ApiProperty() personalizeReason: string
}
