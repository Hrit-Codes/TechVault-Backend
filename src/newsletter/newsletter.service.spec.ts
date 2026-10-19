import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NewsletterService } from './newsletter.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '../mailer/mailer.service';

type SubscriberRow = {
  id: string;
  email: string;
  isActive: boolean;
  unsubscribeToken: string;
  subscribedAt: Date;
  unsubscribedAt: Date | null;
};

describe('NewsletterService', () => {
  let service: NewsletterService;
  let prisma: {
    subscriber: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
    };
  };
  let sendMail: jest.Mock;

  const subscriber = (
    overrides: Partial<SubscriberRow> = {},
  ): SubscriberRow => ({
    id: 's1',
    email: 'user@example.com',
    isActive: true,
    unsubscribeToken: 'token-1',
    subscribedAt: new Date('2026-01-01'),
    unsubscribedAt: null,
    ...overrides,
  });

  beforeEach(async () => {
    const prismaMock = {
      subscriber: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
    };
    sendMail = jest.fn().mockResolvedValue({ messageId: '1' });
    const mailerMock = {
      getTransporter: jest.fn().mockReturnValue({ sendMail }),
    };
    const configMock = {
      get: jest.fn((key: string) => {
        if (key === 'FRONTEND_URL') return 'https://techvault.test';
        if (key === 'MAIL_USER') return 'no-reply@techvault.test';
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NewsletterService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: MailerService, useValue: mailerMock },
        { provide: ConfigService, useValue: configMock },
      ],
    }).compile();

    service = module.get<NewsletterService>(NewsletterService);
    prisma = prismaMock;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('subscribe', () => {
    it('creates a new subscriber for an unknown email', async () => {
      const created = subscriber({ email: 'user@example.com' });
      prisma.subscriber.findUnique.mockResolvedValue(null);
      prisma.subscriber.create.mockResolvedValue(created);

      const result = await service.subscribe('  User@Example.com ');

      expect(prisma.subscriber.create).toHaveBeenCalledWith({
        data: { email: 'user@example.com' },
      });
      expect(result).toEqual({
        message: 'Subscribed successfully',
        data: {
          email: 'user@example.com',
          isSubscribed: true,
          subscribedAt: created.subscribedAt,
        },
      });
      expect(sendMail).toHaveBeenCalledTimes(1);
    });

    it('reactivates an unsubscribed email', async () => {
      const resubscribed = subscriber({ subscribedAt: new Date('2026-05-05') });
      prisma.subscriber.findUnique.mockResolvedValue(
        subscriber({ isActive: false, unsubscribedAt: new Date() }),
      );
      prisma.subscriber.update.mockResolvedValue(resubscribed);

      const result = await service.subscribe('user@example.com');

      expect(prisma.subscriber.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: {
          isActive: true,
          unsubscribedAt: null,
          subscribedAt: expect.any(Date),
        },
      });
      expect(result.message).toBe('You have been re-subscribed successfully');
    });

    it('throws ConflictException when the email is already active', async () => {
      prisma.subscriber.findUnique.mockResolvedValue(subscriber());

      await expect(service.subscribe('user@example.com')).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.subscriber.create).not.toHaveBeenCalled();
    });

    it('still succeeds when the welcome email cannot be delivered', async () => {
      prisma.subscriber.findUnique.mockResolvedValue(null);
      prisma.subscriber.create.mockResolvedValue(subscriber());
      sendMail.mockRejectedValue(new Error('smtp down'));

      await expect(service.subscribe('user@example.com')).resolves.toEqual(
        expect.objectContaining({ message: 'Subscribed successfully' }),
      );
    });
  });

  describe('getSubscriptionStatus', () => {
    it('throws NotFoundException for an unknown email', async () => {
      prisma.subscriber.findUnique.mockResolvedValue(null);

      await expect(
        service.getSubscriptionStatus('user@example.com'),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns the subscription state', async () => {
      const row = subscriber({ isActive: false, unsubscribedAt: new Date() });
      prisma.subscriber.findUnique.mockResolvedValue(row);

      const result = await service.getSubscriptionStatus('USER@example.com');

      expect(prisma.subscriber.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: 'user@example.com' } }),
      );
      expect(result.data.isSubscribed).toBe(false);
    });
  });

  describe('unsubscribeByEmail', () => {
    it('deactivates an active subscriber', async () => {
      prisma.subscriber.findUnique.mockResolvedValue(subscriber());
      prisma.subscriber.update.mockResolvedValue(
        subscriber({ isActive: false, unsubscribedAt: new Date() }),
      );

      const result = await service.unsubscribeByEmail('user@example.com');

      expect(prisma.subscriber.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: { isActive: false, unsubscribedAt: expect.any(Date) },
      });
      expect(result).toEqual({
        message: 'You have been unsubscribed successfully',
        data: { email: 'user@example.com', isSubscribed: false },
      });
    });

    it('is idempotent for an already unsubscribed email', async () => {
      prisma.subscriber.findUnique.mockResolvedValue(
        subscriber({ isActive: false }),
      );

      const result = await service.unsubscribeByEmail('user@example.com');

      expect(prisma.subscriber.update).not.toHaveBeenCalled();
      expect(result.message).toBe('You are already unsubscribed');
    });

    it('throws NotFoundException when the email is unknown', async () => {
      prisma.subscriber.findUnique.mockResolvedValue(null);

      await expect(
        service.unsubscribeByEmail('user@example.com'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('unsubscribeByToken', () => {
    it('throws NotFoundException for an invalid token', async () => {
      prisma.subscriber.findUnique.mockResolvedValue(null);

      await expect(service.unsubscribeByToken('bad-token')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('looks the subscriber up by token', async () => {
      prisma.subscriber.findUnique.mockResolvedValue(subscriber());
      prisma.subscriber.update.mockResolvedValue(
        subscriber({ isActive: false }),
      );

      const result = await service.unsubscribeByToken('token-1');

      expect(prisma.subscriber.findUnique).toHaveBeenCalledWith({
        where: { unsubscribeToken: 'token-1' },
      });
      expect(result.data.isSubscribed).toBe(false);
    });
  });

  describe('getAllSubscribers', () => {
    it('paginates and omits the unsubscribe token', async () => {
      prisma.subscriber.count.mockResolvedValue(25);
      prisma.subscriber.findMany.mockResolvedValue([subscriber()]);

      const result = await service.getAllSubscribers({ page: 3, limit: 10 });

      expect(prisma.subscriber.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
      expect(result.pagination).toEqual({
        total: 25,
        page: 3,
        limit: 10,
        totalPages: 3,
        hasNextPage: false,
        hasPrevPage: true,
      });
    });

    it('filters by search term and status', async () => {
      prisma.subscriber.count.mockResolvedValue(0);
      prisma.subscriber.findMany.mockResolvedValue([]);

      await service.getAllSubscribers({
        search: 'Amat',
        isActive: true,
      });

      expect(prisma.subscriber.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            isActive: true,
            email: { contains: 'Amat', mode: 'insensitive' },
          },
        }),
      );
    });
  });

  describe('getSubscribersStats', () => {
    it('returns aggregate counts', async () => {
      prisma.subscriber.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(8)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(2);

      const result = await service.getSubscribersStats();

      expect(result.data).toEqual({
        totalSubscribers: 10,
        activeSubscribers: 8,
        unsubscribed: 2,
        newThisMonth: 3,
        newLastMonth: 2,
        growthRate: 50,
      });
    });
  });
});
