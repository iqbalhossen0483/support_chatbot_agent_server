import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Chunk } from './chunk.entity.js';
import { Website } from './website.entity.js';

export enum PageStatus {
  PENDING = 'pending',
  SCRAPED = 'scraped',
  CHUNKED = 'chunked',
  ERROR = 'error',
}

@Entity('pages')
@Unique(['website_id', 'url'])
@Index(['website_id', 'status'])
export class Page {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  website_id: number;

  @Column({ type: 'varchar', length: 2048 })
  url: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  title: string | null;

  @Column({ type: 'text', nullable: true })
  raw_html: string | null;

  @Column({ type: 'text', nullable: true })
  clean_text: string | null;

  @Column({ type: 'enum', enum: PageStatus, default: PageStatus.PENDING })
  status: PageStatus;

  @Column({ type: 'int', nullable: true })
  http_status: number | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Website, (website: Website) => website.pages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'website_id' })
  website: Website;

  @OneToMany(() => Chunk, (chunk: Chunk) => chunk.page)
  chunks: Chunk[];
}
