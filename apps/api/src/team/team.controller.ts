import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { TeamService } from './team.service';
import type { Role } from '../common/types';

@Controller('team')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get()
  findAll() {
    return this.teamService.findAll();
  }

  @Post('invite')
  invite(@Body() body: { name: string; email: string; role: Role }) {
    return this.teamService.invite(body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.teamService.remove(id);
  }
}
