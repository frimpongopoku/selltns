import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { TeamService } from './team.service';
import type { Role } from '../common/types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { SessionPayload } from '../auth/jwt-auth.guard';

// Team management is entirely OWNER-only — inviting/removing members
// changes who has access to the store, on par with domain/billing.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER')
@Controller('team')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get()
  findAll(@CurrentUser() user: SessionPayload) {
    return this.teamService.findAll(user.tenantId);
  }

  @Post('invite')
  invite(
    @CurrentUser() user: SessionPayload,
    @Body() body: { name: string; email: string; role: Role },
  ) {
    return this.teamService.invite(user.tenantId, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: SessionPayload) {
    return this.teamService.remove(id, user.tenantId);
  }
}
