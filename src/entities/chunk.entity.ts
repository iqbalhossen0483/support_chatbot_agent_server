import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Page } from './page.entity.js';
import { Website } from './website.entity.js';

@Entity('chunks')
@Index(['website_id'])
@Index(['page_id'])
export class Chunk {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  page_id: number;

  @Column({ type: 'int' })
  website_id: number;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'int' })
  token_count: number;

  @Column({ type: 'int' })
  chunk_index: number;

  // pgvector column — managed via raw SQL in migration
  // TypeORM doesn't natively support VECTOR type, so we use a string column
  // and handle it in the migration and repository layer
  @Column({ type: 'float', array: true, nullable: true })
  embedding: number[] | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Page, (page: Page) => page.chunks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'page_id' })
  page: Page;

  @ManyToOne(() => Website, (website: Website) => website.chunks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'website_id' })
  website: Website;
}
