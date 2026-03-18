import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Announcement } from '../common/entities/announcement.entity';

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectRepository(Announcement)
    private announcementRepository: Repository<Announcement>,
  ) {}

  private normalizePayload(payload: Partial<Announcement>) {
    const normalized: Partial<Announcement> = {};

    if (payload.title !== undefined) {
      normalized.title = String(payload.title || '').trim();
    }

    if (payload.content !== undefined) {
      normalized.content = String(payload.content || '').trim();
    }

    if (payload.status !== undefined) {
      normalized.status = payload.status;
    }

    if (payload.isPinned !== undefined) {
      normalized.isPinned = !!payload.isPinned;
    }

    return normalized;
  }

  private applyLifecycleFields(target: Announcement, payload: Partial<Announcement>) {
    const nextStatus = payload.status || target.status || 'draft';
    target.status = nextStatus;
    target.isPinned = payload.isPinned !== undefined ? !!payload.isPinned : !!target.isPinned;

    if (nextStatus === 'published') {
      target.publishedAt = target.publishedAt || new Date();
      return;
    }

    target.publishedAt = null;
  }

  async getActiveAnnouncement() {
    return this.announcementRepository.findOne({
      where: { status: 'published' },
      order: {
        isPinned: 'DESC',
        publishedAt: 'DESC',
        updatedAt: 'DESC',
        id: 'DESC',
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

  async getAnnouncementList(status?: string) {
    return this.announcementRepository.find({
      where: status ? { status: status as Announcement['status'] } : undefined,
      order: {
        isPinned: 'DESC',
        publishedAt: 'DESC',
        updatedAt: 'DESC',
        id: 'DESC',
      },
    });
  }

  async createAnnouncement(payload: Partial<Announcement>) {
    const normalized = this.normalizePayload(payload);
    const nextAnnouncement = this.announcementRepository.create({
      title: normalized.title || '',
      content: normalized.content || '',
      status: normalized.status || 'draft',
      isPinned: normalized.isPinned !== undefined ? normalized.isPinned : true,
    });

    this.applyLifecycleFields(nextAnnouncement, normalized);
    return this.announcementRepository.save(nextAnnouncement);
  }

  async updateAnnouncement(id: number, payload: Partial<Announcement>) {
    const current = await this.announcementRepository.findOne({ where: { id } });
    if (!current) {
      throw new NotFoundException('Announcement not found');
    }

    const normalized = this.normalizePayload(payload);
    const nextAnnouncement = this.announcementRepository.merge(current, normalized);
    this.applyLifecycleFields(nextAnnouncement, normalized);
    return this.announcementRepository.save(nextAnnouncement);
  }

  async saveCurrentAnnouncement(payload: Partial<Announcement>) {
    const current = await this.getCurrentAnnouncement();
    if (!current) {
      return this.createAnnouncement(payload);
    }

    return this.updateAnnouncement(current.id, payload);
  }

  async deleteAnnouncement(id: number) {
    const current = await this.announcementRepository.findOne({ where: { id } });
    if (!current) {
      throw new NotFoundException('Announcement not found');
    }

    await this.announcementRepository.remove(current);
    return { success: true };
  }
}
