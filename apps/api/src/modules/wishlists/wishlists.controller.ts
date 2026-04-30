import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req, HttpCode } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { AuthGuard } from '../auth/auth.guard'
import { WishlistsService } from './wishlists.service'
import { AddWishlistDto, UpdateWishlistDto } from './dto/add-wishlist.dto'

@ApiTags('wishlists')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller()
export class WishlistsController {
  constructor(private readonly service: WishlistsService) {}

  @Get('me/wishlists')
  @ApiOperation({ summary: '내 위시리스트 목록' })
  async listMine(@Req() req: any) {
    return this.service.listByUser(req.user.supabaseUserId)
  }

  @Post('wishlists')
  @ApiOperation({ summary: '위시리스트 추가 (Free: 10개 한도)' })
  async add(@Req() req: any, @Body() dto: AddWishlistDto) {
    return this.service.add(req.user.supabaseUserId, dto)
  }

  @Patch('wishlists/:isbn')
  @ApiOperation({ summary: '위시리스트 메모 수정' })
  async update(@Req() req: any, @Param('isbn') isbn: string, @Body() dto: UpdateWishlistDto) {
    return this.service.update(req.user.supabaseUserId, isbn, dto)
  }

  @Delete('wishlists/:isbn')
  @HttpCode(204)
  @ApiOperation({ summary: '위시리스트 삭제' })
  async remove(@Req() req: any, @Param('isbn') isbn: string) {
    await this.service.remove(req.user.supabaseUserId, isbn)
  }
}
