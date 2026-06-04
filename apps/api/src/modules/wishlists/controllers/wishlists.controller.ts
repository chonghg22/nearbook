import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { AuthGuard } from '../../auth/guards/auth.guard'
import { WishlistsService } from '../services/wishlists.service'
import { AddWishlistDto, UpdateWishlistDto } from '../dto'

@ApiTags('wishlists')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller()
export class WishlistsController {
  constructor(private readonly service: WishlistsService) {}

  @Get('me/wishlists')
  @ApiOperation({ summary: '내 위시리스트 목록' })
  listMine(@Req() req: any) {
    return this.service.listByUser(req.user.supabaseUserId)
  }

  @Get('me/wishlists/:isbn/status')
  @ApiOperation({ summary: '특정 책의 위시리스트 등록 여부' })
  getStatus(@Req() req: any, @Param('isbn') isbn: string) {
    return this.service.getStatus(req.user.supabaseUserId, isbn)
  }

  @Post('wishlists')
  @ApiOperation({ summary: '위시리스트 추가 (Free: 10개 한도)' })
  add(@Req() req: any, @Body() dto: AddWishlistDto) {
    return this.service.add(req.user.supabaseUserId, req.user.email, dto)
  }

  @Patch('wishlists/:isbn')
  @ApiOperation({ summary: '위시리스트 메모 수정' })
  update(
    @Req() req: any,
    @Param('isbn') isbn: string,
    @Body() dto: UpdateWishlistDto,
  ) {
    return this.service.update(req.user.supabaseUserId, isbn, dto)
  }

  @Delete('wishlists/:isbn')
  @HttpCode(204)
  @ApiOperation({ summary: '위시리스트 삭제' })
  async remove(@Req() req: any, @Param('isbn') isbn: string) {
    await this.service.remove(req.user.supabaseUserId, isbn)
  }
}
