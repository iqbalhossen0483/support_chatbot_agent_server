import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Conversation } from './conversation.entity.js';
import { User } from './user.entity.js';

export enum EscalationStatus {
  PENDING = 'pending',
  CLAIMED = 'claimed',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  EXPIRED = 'expired',
}

export enum EscalationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

@Entity('escalations')
@Index(['status', 'priority', 'created_at'])
export class Escalation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  conversation_id: string;

  @Column({
    type: 'enum',
    enum: EscalationStatus,
    default: EscalationStatus.PENDING,
  })
  status: EscalationStatus;

  @Column({
    type: 'enum',
    enum: EscalationPriority,
    default: EscalationPriority.MEDIUM,
  })
  priority: EscalationPriority;

  @Column({ type: 'varchar', length: 100 })
  trigger: string;

  @Column({ type: 'text' })
  summary: string;

  @Column({ type: 'jsonb' })
  context_data: Record<string, unknown>;

  @Column({ type: 'uuid', nullable: true })
  claimed_by: string | null;

  @Column({ type: 'timestamp', nullable: true })
  claimed_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  resolved_at: Date | null;

  @Column({ type: 'text', nullable: true })
  resolution_notes: string | null;

  @CreateDateColumn()
  created_at: Date;

  @OneToOne(
    () => Conversation,
    (conversation: Conversation) => conversation.escalation,
  )
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'claimed_by' })
  claimed_by_user: User | null;
}
