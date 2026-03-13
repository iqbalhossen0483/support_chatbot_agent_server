import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Escalation } from './escalation.entity.js';
import { Message } from './message.entity.js';
import { Website } from './website.entity.js';

export enum ConversationStatus {
  ACTIVE = 'active',
  ESCALATED = 'escalated',
  RESOLVED = 'resolved',
  EXPIRED = 'expired',
}

@Entity('conversations')
@Index(['website_id', 'status'])
@Index(['session_id'])
export class Conversation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  website_id: number;

  @Column({ type: 'varchar', length: 255 })
  session_id: string;

  @Column({
    type: 'enum',
    enum: ConversationStatus,
    default: ConversationStatus.ACTIVE,
  })
  status: ConversationStatus;

  @Column({ type: 'boolean', default: false })
  is_escalated: boolean;

  @Column({ type: 'jsonb', default: {} })
  visitor_metadata: Record<string, unknown>;

  @Column({ type: 'int', default: 0 })
  message_count: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  closed_at: Date | null;

  @ManyToOne(() => Website, (website: Website) => website.conversations)
  @JoinColumn({ name: 'website_id' })
  website: Website;

  @OneToMany(() => Message, (message: Message) => message.conversation)
  messages: Message[];

  @OneToOne(
    () => Escalation,
    (escalation: Escalation) => escalation.conversation,
  )
  escalation: Escalation | null;
}
