import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHistoryDto } from './dto/create-history.dto';

@Injectable()
export class HistoryService {
  constructor(private prisma: PrismaService) {}

  async create(createHistoryDto: CreateHistoryDto) {
    return this.prisma.history.create({
      data: createHistoryDto,
    });
  }

  async findAll() {
    const records = await this.prisma.history.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return this.attachUserNames(records);
  }

  async findByUserId(userid: number) {
    const records = await this.prisma.history.findMany({
      where: { userid },
      orderBy: { createdAt: 'desc' },
    });
    return this.attachUserNames(records);
  }

  private async attachUserNames(records: any[]) {
    const userIds = [...new Set(records.map(r => r.userid).filter(id => id > 0))];
    const users = userIds.length
      ? await this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, user: true } })
      : [];
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));
    return records.map(r => ({
      ...r,
      userName: r.userid > 0 ? (userMap[r.userid]?.name ?? 'Sistema') : 'Sistema',
      userLogin: r.userid > 0 ? (userMap[r.userid]?.user ?? '') : '',
    }));
  }
}
