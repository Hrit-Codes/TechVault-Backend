import { Test, TestingModule } from '@nestjs/testing';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

describe('CartController', () => {
  let controller: CartController;
  let service: Record<
    'getCart' | 'addToCart' | 'updateCartItem' | 'removeCartItem' | 'clearCart',
    jest.Mock
  >;

  beforeEach(async () => {
    const cartServiceMock = {
      getCart: jest.fn(),
      addToCart: jest.fn(),
      updateCartItem: jest.fn(),
      removeCartItem: jest.fn(),
      clearCart: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
      providers: [{ provide: CartService, useValue: cartServiceMock }],
    }).compile();

    controller = module.get<CartController>(CartController);
    service = cartServiceMock;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getCart passes the user id through', async () => {
    await controller.getCart('user-1');

    expect(service.getCart).toHaveBeenCalledWith('user-1');
  });

  it('addToCart passes the user id and dto through', async () => {
    const dto = { productId: 'p1', variantId: 'v1', quantity: 2 };

    await controller.addToCart('user-1', dto);

    expect(service.addToCart).toHaveBeenCalledWith('user-1', dto);
  });

  it('updateCartItem passes the user id, item id and dto through', async () => {
    const dto = { quantity: 3 };

    await controller.updateCartItem('user-1', 'item-1', dto);

    expect(service.updateCartItem).toHaveBeenCalledWith(
      'user-1',
      'item-1',
      dto,
    );
  });

  it('removeCartItem passes the user id and item id through', async () => {
    await controller.removeCartItem('user-1', 'item-1');

    expect(service.removeCartItem).toHaveBeenCalledWith('user-1', 'item-1');
  });

  it('clearCart passes the user id through', async () => {
    await controller.clearCart('user-1');

    expect(service.clearCart).toHaveBeenCalledWith('user-1');
  });
});
