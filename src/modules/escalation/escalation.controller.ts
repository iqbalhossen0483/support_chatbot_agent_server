import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUserId } from '../../common/decorators/current-user.decorator.js';
import { EscalationStatus } from '../../entities/escalation.entity.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { EscalationService } from './escalation.service.js';

@Controller('escalations')
@UseGuards(JwtAuthGuard)
export class EscalationController {
  constructor(private readonly escalationService: EscalationService) {}

  @Get()
  async listEscalations(@Query('status') status?: EscalationStatus) {
    return this.escalationService.listEscalations(status);
  }

  @Get(':id')
  async getEscalation(@Param('id', ParseIntPipe) id: number) {
    return this.escalationService.getEscalation(id);
  }

  @Post(':id/claim')
  async claimEscalation(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUserId() userId: number,
  ) {
    return this.escalationService.claimEscalation(id, userId);
  }

  @Post(':id/resolve')
  async resolveEscalation(
    @Param('id', ParseIntPipe) id: number,
    @Body('resolutionNotes') resolutionNotes?: string,
  ) {
    return this.escalationService.resolveEscalation(id, resolutionNotes);
  }
}
