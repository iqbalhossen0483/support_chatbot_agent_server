import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Chunk } from './chunk.entity.js';
import { Conversation } from './conversation.entity.js';
import { Page } from './page.entity.js';

export enum WebsiteStatus {
  PENDING = 'pending',
  SCRAPING = 'scraping',
  READY = 'ready',
  ERROR = 'error',
}

@Entity('websites')
export class Website {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 2048, unique: true })
  base_url: string;

  @Column({ type: 'enum', enum: WebsiteStatus, default: WebsiteStatus.PENDING })
  status: WebsiteStatus;

  @Column({ type: 'jsonb', default: {} })
  scrape_config: Record<string, unknown>;

  @Column({ type: 'varchar', length: 100, default: '0 2 * * *' })
  rescrape_cron: string;

  @Column({ type: 'int', default: 0 })
  total_pages: number;

  @Column({ type: 'int', default: 0 })
  total_chunks: number;

  @Column({ type: 'text', nullable: true })
  brand_context: string | null;

  @Column({ type: 'varchar', length: 255 })
  api_key_hash: string;

  @Column({ type: 'timestamp', nullable: true })
  last_scraped_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => Page, (page: Page) => page.website)
  pages: Page[];

  @OneToMany(() => Chunk, (chunk: Chunk) => chunk.website)
  chunks: Chunk[];

  @OneToMany(
    () => Conversation,
    (conversation: Conversation) => conversation.website,
  )
  conversations: Conversation[];
}
