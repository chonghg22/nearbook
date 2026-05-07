import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
  HttpCode,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { AuthGuard } from '../auth/auth.guard'
import { LibraryCardsService } from './library-cards.service'
import { AddLibraryCardDto, UpdateLibraryCardDto } from './dto'

@ApiTags('library-cards')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller()
export class LibraryCardsController {
  constructor(private readonly service: LibraryCardsService) {}

  @Get('me/library-cards')
  @ApiOperation({ summary: '내 도서관 카드 목록' })
  listMine(@Req() req: any) {
    return this.service.listByUser(req.user.supabaseUserId)
  }

  @Get('me/library-cards/:libraryId/status')
  @ApiOperation({ summary: '특정 도서관의 즐겨찾기 등록 여부' })
  getStatus(@Req() req: any, @Param('libraryId', ParseIntPipe) libraryId: number) {
    return this.service.getStatus(req.user.supabaseUserId, libraryId)
  }

  @Post('library-cards')
  @ApiOperation({ summary: '도서관 카드 추가 (Free: 1개 한도)' })
  add(@Req() req: any, @Body() dto: AddLibraryCardDto) {
    return this.service.add(req.user.supabaseUserId, dto)
  }

  @Patch('library-cards/:id')
  @ApiOperation({ summary: '도서관 카드 정보 수정' })
  update(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLibraryCardDto,
  ) {
    return this.service.update(req.user.supabaseUserId, id, dto)
  }

  @Delete('library-cards/:id')
  @HttpCode(204)
  @ApiOperation({ summary: '도서관 카드 삭제' })
  async remove(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    await this.service.remove(req.user.supabaseUserId, id)
  }

  @Delete('library-cards/by-library/:libraryId')
  @HttpCode(204)
  @ApiOperation({ summary: '도서관 ID로 도서관 카드 삭제' })
  async removeByLibraryId(
    @Req() req: any,
    @Param('libraryId', ParseIntPipe) libraryId: number,
  ) {
    await this.service.removeByLibraryId(req.user.supabaseUserId, libraryId)
  }
}
