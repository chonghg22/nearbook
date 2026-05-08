import { Controller, Get, Param } from '@nestjs/common'
import { AffiliatesService } from './affiliates.service'
import { AffiliateItemDto } from './dto/affiliate-item.dto'

@Controller('books')
export class AffiliatesController {
  constructor(private readonly affiliatesService: AffiliatesService) {}

  @Get(':isbn/affiliates')
  async getAffiliates(
    @Param('isbn') isbn: string,
  ): Promise<{ data: AffiliateItemDto[] }> {
    const data = await this.affiliatesService.getAffiliateOptions(isbn)
    return { data }
  }
}
