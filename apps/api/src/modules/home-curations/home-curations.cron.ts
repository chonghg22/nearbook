import { Injectable } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { HomeCurationsService } from './home-curations.service'
import { JobStatusService, CURATION_JOBS } from '../operations/job-status.service'

@Injectable()
export class HomeCurationsCron {
  constructor(
    private readonly homeCurations: HomeCurationsService,
    private readonly jobs: JobStatusService
  ) {}

  @Cron(CURATION_JOBS['curation:loan'], { name: 'curation:loan', timeZone: 'Asia/Seoul' })
  async refreshLoanItemBooks() {
    await this.jobs.run('curation:loan', () => this.homeCurations.refreshLoanItemBooks(20))
  }
  @Cron(CURATION_JOBS['curation:trend'], { name: 'curation:trend', timeZone: 'Asia/Seoul' })
  async refreshHotTrendBooks() {
    await this.jobs.run('curation:trend', () => this.homeCurations.refreshHotTrendBooks(20))
  }
  @Cron(CURATION_JOBS['curation:keywords'], { name: 'curation:keywords', timeZone: 'Asia/Seoul' })
  async refreshMonthlyKeywords() {
    await this.jobs.run('curation:keywords', () => this.homeCurations.refreshMonthlyKeywords(10))
  }
  @Cron(CURATION_JOBS['curation:categories'], {
    name: 'curation:categories',
    timeZone: 'Asia/Seoul',
  })
  async refreshCategoryCurations() {
    await this.jobs.run('curation:categories', () =>
      this.homeCurations.refreshCategoryCurations(40)
    )
  }
  @Cron(CURATION_JOBS['curation:new-arrivals'], {
    name: 'curation:new-arrivals',
    timeZone: 'Asia/Seoul',
  })
  async refreshFeaturedLibraryNewArrivals() {
    await this.jobs.run('curation:new-arrivals', () =>
      this.homeCurations.refreshFeaturedLibraryNewArrivals(40, 12)
    )
  }
}
