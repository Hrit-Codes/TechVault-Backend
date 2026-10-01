import { Test, TestingModule } from '@nestjs/testing';
import { NewsletterController } from './newsletter.controller';
import { NewsletterService } from './newsletter.service';

describe('NewsletterController', () => {
  let controller: NewsletterController;
  let service: Record<
    | 'subscribe'
    | 'getSubscriptionStatus'
    | 'unsubscribeByEmail'
    | 'unsubscribeByToken'
    | 'getAllSubscribers'
    | 'getSubscribersStats',
    jest.Mock
  >;

  beforeEach(async () => {
    const newsletterServiceMock = {
      subscribe: jest.fn(),
      getSubscriptionStatus: jest.fn(),
      unsubscribeByEmail: jest.fn(),
      unsubscribeByToken: jest.fn(),
      getAllSubscribers: jest.fn(),
      getSubscribersStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NewsletterController],
      providers: [
        { provide: NewsletterService, useValue: newsletterServiceMock },
      ],
    }).compile();

    controller = module.get<NewsletterController>(NewsletterController);
    service = newsletterServiceMock;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('subscribe forwards the email to the service', async () => {
    const dto = { email: 'user@example.com' };
    service.subscribe.mockResolvedValue({ message: 'Subscribed successfully' });

    await controller.subscribe(dto);

    expect(service.subscribe).toHaveBeenCalledWith(dto.email);
  });

  it('checkSubscriptionStatus forwards the email to the service', async () => {
    const dto = { email: 'user@example.com' };
    service.getSubscriptionStatus.mockResolvedValue({ message: 'ok' });

    await controller.checkSubscriptionStatus(dto);

    expect(service.getSubscriptionStatus).toHaveBeenCalledWith(dto.email);
  });

  it('unsubscribe forwards the email to the service', async () => {
    const dto = { email: 'user@example.com' };
    service.unsubscribeByEmail.mockResolvedValue({ message: 'ok' });

    await controller.unsubscribe(dto);

    expect(service.unsubscribeByEmail).toHaveBeenCalledWith(dto.email);
  });

  it('unsubscribeByToken forwards the token to the service', async () => {
    service.unsubscribeByToken.mockResolvedValue({ message: 'ok' });

    await controller.unsubscribeByToken('token-1');

    expect(service.unsubscribeByToken).toHaveBeenCalledWith('token-1');
  });

  it('getAllSubscribers forwards the query to the service', async () => {
    const query = { page: 2, limit: 25 };
    service.getAllSubscribers.mockResolvedValue({ message: 'ok', data: [] });

    await controller.getAllSubscribers(query);

    expect(service.getAllSubscribers).toHaveBeenCalledWith(query);
  });

  it('getSubscribersStats delegates to the service', async () => {
    service.getSubscribersStats.mockResolvedValue({ message: 'ok' });

    await controller.getSubscribersStats();

    expect(service.getSubscribersStats).toHaveBeenCalled();
  });
});
