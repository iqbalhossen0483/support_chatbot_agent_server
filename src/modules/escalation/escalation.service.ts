import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Escalation,
  EscalationPriority,
  EscalationStatus,
} from '../../entities/escalation.entity.js';
import { Message, MessageRole } from '../../entities/message.entity.js';

@Injectable()
export class EscalationService {
  private readonly logger = new Logger(EscalationService.name);

  constructor(
    @InjectRepository(Escalation)
    private readonly escalationRepo: Repository<Escalation>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
  ) {}

  async createEscalation(
    conversationId: number,
    websiteId: number,
    trigger: string,
    conversationHistory: Message[],
  ): Promise<Escalation> {
    // Build summary from conversation
    const userMessages = conversationHistory.filter(
      (m) => m.role === MessageRole.USER,
    );
    const lastUserMessage = userMessages[userMessages.length - 1];
    const summary = `User asked: "${lastUserMessage?.content || 'N/A'}". Escalation trigger: ${trigger}.`;

    const contextData = {
      conversationId,
      websiteId,
      trigger,
      conversationHistory: conversationHistory.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: m.created_at,
        confidenceScore: m.confidence_score,
      })),
    };

    const escalation = this.escalationRepo.create({
      conversation_id: conversationId,
      status: EscalationStatus.PENDING,
      priority: this.determinePriority(trigger),
      trigger,
      summary,
      context_data: contextData,
    });

    const saved = await this.escalationRepo.save(escalation);
    this.logger.log(
      `Escalation created: ${saved.id} for conversation ${conversationId}`,
    );
    return saved;
  }

  async getEscalation(id: number): Promise<Escalation> {
    const escalation = await this.escalationRepo.findOne({
      where: { id },
      relations: ['conversation'],
    });
    if (!escalation) throw new NotFoundException('Escalation not found');
    return escalation;
  }

  async listEscalations(status?: EscalationStatus) {
    const where = status ? { status } : {};
    return this.escalationRepo.find({
      where,
      order: { created_at: 'DESC' },
      relations: ['conversation'],
    });
  }

  async claimEscalation(id: number, agentId: number): Promise<Escalation> {
    const escalation = await this.getEscalation(id);

    if (escalation.status !== EscalationStatus.PENDING) {
      throw new BadRequestException('Escalation is not in PENDING status');
    }

    escalation.status = EscalationStatus.CLAIMED;
    escalation.claimed_by = agentId;
    escalation.claimed_at = new Date();

    return this.escalationRepo.save(escalation);
  }

  async resolveEscalation(
    id: number,
    resolutionNotes?: string,
  ): Promise<Escalation> {
    const escalation = await this.getEscalation(id);

    if (
      ![EscalationStatus.CLAIMED, EscalationStatus.IN_PROGRESS].includes(
        escalation.status,
      )
    ) {
      throw new BadRequestException(
        'Escalation must be claimed or in progress to resolve',
      );
    }

    escalation.status = EscalationStatus.RESOLVED;
    escalation.resolved_at = new Date();
    escalation.resolution_notes = resolutionNotes || null;

    return this.escalationRepo.save(escalation);
  }

  private determinePriority(trigger: string): EscalationPriority {
    const highPriorityTriggers = ['safety', 'legal', 'complaint'];
    const lowPriorityTriggers = ['user_request'];

    if (highPriorityTriggers.some((t) => trigger.includes(t))) {
      return EscalationPriority.HIGH;
    }
    if (lowPriorityTriggers.some((t) => trigger.includes(t))) {
      return EscalationPriority.LOW;
    }
    return EscalationPriority.MEDIUM;
  }
}
