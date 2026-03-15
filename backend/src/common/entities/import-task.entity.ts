import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('import_tasks')
export class ImportTask {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: number;

  @Column({ name: 'image_url', length: 500 })
  imageUrl: string;

  @Column({ name: 'ocr_result', type: 'text', nullable: true })
  ocrResult: string;

  @Column({ name: 'parsed_data', type: 'json', nullable: true })
  parsedData: any;

  @Column({ type: 'enum', enum: ['pending', 'processing', 'success', 'failed'], default: 'pending' })
  status: string;

  @Column({ name: 'error_msg', type: 'text', nullable: true })
  errorMsg: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
