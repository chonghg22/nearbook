import { PartialType } from '@nestjs/swagger'
import { CreateAdminNoticeDto } from './create-admin-notice.dto'

export class UpdateAdminNoticeDto extends PartialType(CreateAdminNoticeDto) {}
