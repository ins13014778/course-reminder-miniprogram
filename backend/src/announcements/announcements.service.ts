import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Announcement } from '../common/entities/announcement.entity';

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectRepository(Announcement)
    private announcementRepository: Repository<Announcement>,
  ) {}

  async getActiveAnnouncement() {
    return this.announcementRepository.findOne({
      where: { status: 'published' },
      order: {
        isPinned: 'DESC',
        updatedAt: 'DESC',
      },
    });
  }

  async getCurrentAnnouncement() {
    return this.announcementRepository.findOne({
      order: {
        updatedAt: 'DESC',
      },
    });
  }

  async saveCurrentAnnouncement(payload: Partial<Announcement>) {
    const current = await this.getCurrentAnnouncement();
    const nextStatus = payload.status || 'draft';
    const nextAnnouncement = current
      ? this.announcementRepository.merge(current, payload)
      : this.announcementRepository.create(payload);

    nextAnnouncement.status = nextStatus;
    nextAnnouncement.isPinned = payload.isPinned !== undefined ? !!payload.isPinned : true;
    nextAnnouncement.publishedAt = nextStatus === 'published'
      ? (current && current.publishedAt ? current.publishedAt : new Date())
      : null;

    return this.announcementRepository.save(nextAnnouncement);
  }
}
