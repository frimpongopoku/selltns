import { Injectable } from '@nestjs/common';
import { teamMembers as seedTeamMembers } from '../common/seed-data';
import { Role, TeamMember } from '../common/types';

@Injectable()
export class TeamService {
  private members: TeamMember[] = [...seedTeamMembers];

  findAll(): TeamMember[] {
    return this.members;
  }

  invite(input: { name: string; email: string; role: Role }): TeamMember {
    const member: TeamMember = {
      id: `user_${Date.now()}`,
      tenantId: 'tenant_demo',
      name: input.name,
      email: input.email,
      role: input.role,
      invitedAt: new Date().toISOString(),
      acceptedAt: null,
    };
    this.members = [...this.members, member];
    return member;
  }

  remove(id: string): { id: string } {
    this.members = this.members.filter((m) => m.id !== id);
    return { id };
  }
}
