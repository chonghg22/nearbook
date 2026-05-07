import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { HomeCurationsService } from './home-curations.service'

@Injectable()
export class HomeCurationsCron {
  private readonly logger = new Logger(HomeCurationsCron.name)

  constructor(private readonly homeCurations: HomeCurationsService) {}

  @Cron('10 3 * * *', { timeZone: 'Asia/Seoul' })
  async refreshLoanItemBooks() {
    const result = await this.homeCurations.refreshLoanItemBooks(20)
    this.logger.log(`loan_item_books refresh result: ${JSON.stringify(result)}`)
  }

  @Cron('20 3 * * *', { timeZone: 'Asia/Seoul' })
  async refreshHotTrendBooks() {
    const result = await this.homeCurations.refreshHotTrendBooks(20)
    this.logger.log(`hot_trend_books refresh result: ${JSON.stringify(result)}`)
  }

  @Cron('30 3 1 * *', { timeZone: 'Asia/Seoul' })
  async refreshMonthlyKeywords() {
    const result = await this.homeCurations.refreshMonthlyKeywords(10)
    this.logger.log(`monthly_keywords refresh result: ${JSON.stringify(result)}`)
  }
}
