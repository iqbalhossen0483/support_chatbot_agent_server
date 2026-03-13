import { Controller, Get, Post, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { EscalationService } from './escalation.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { EscalationStatus } from '../../entities/escalation.entity.js';

@Controller('escalations')
@UseGuards(JwtAuthGuard)
export class EscalationController {
  constructor(private readonly escalationService: EscalationService) {}

  @Get()
  async listEscalations(@Query('status') status?: EscalationStatus) {
    return this.escalationService.listEscalations(status);
  }

  @Get(':id')
  async getEscalation(@Param('id') id: string) {
    return this.escalationService.getEscalation(id);
  }

  @Post(':id/claim')
  async claimEscalation(@Param('id') id: string, @Req() req: any) {
    return this.escalationService.claimEscalation(id, req.user.id);
  }

  @Post(':id/resolve')
  async resolveEscalation(
    @Param('id') id: string,
    @Body('resolutionNotes') resolutionNotes?: string,
  ) {
    return this.escalationService.resolveEscalation(id, resolutionNotes);
  }
}
