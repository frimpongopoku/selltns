import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { TeamService } from './team.service';
import type { Role } from '../common/types';

@Controller('team')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get()
  findAll(@Query('tenantId') tenantId: string) {
    return this.teamService.findAll(tenantId);
  }

  @Post('invite')
  invite(
    @Body() body: { tenantId: string; name: string; email: string; role: Role },
  ) {
    return this.teamService.invite(body.tenantId, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.teamService.remove(id, tenantId);
  }
}
