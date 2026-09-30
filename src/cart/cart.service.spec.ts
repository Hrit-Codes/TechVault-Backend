import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CartService } from './cart.service';
import { PrismaService } from '../prisma/prisma.service';
import { OffersService } from '../offers/offers.service';
import { AddToCartDto } from './dto/add-to-cart.dto';

type ProductRow = {
  id: string;
  isActive: boolean;
  stock: number;
  price: number;
};

type VariantRow = {
  id: string;
  productId: string;
  isActive: boolean;
  priceOverride: number | null;
  stockOverride: number | null;
};

type StoredCartItem = {
  id: string;
  quantity: number;
  createdAt: Date;
  userId: string;
  productId: string;
  variantId: string | null;
  product: ProductRow;
  variant: Omit<VariantRow, 'productId'> | null;
};

describe('CartService', () => {
  let service: CartService;
  let prisma: {
    product: { findUnique: jest.Mock };
    productVariant: { findUnique: jest.Mock };
    cartItem: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
    };
  };
  let offersService: { getActiveOffersForResolution: jest.Mock };

  const product = (overrides: Partial<ProductRow> = {}): ProductRow => ({
    id: 'p1',
    isActive: true,
    stock: 10,
    price: 100,
    ...overrides,
  });

  const variant = (overrides: Partial<VariantRow> = {}): VariantRow => ({
    id: 'v1',
    productId: 'p1',
    isActive: true,
    priceOverride: null,
    stockOverride: null,
    ...overrides,
  });

  const storedItem = (
    overrides: Partial<StoredCartItem> = {},
  ): StoredCartItem => ({
    id: 'ci1',
    quantity: 2,
    createdAt: new Date('2026-01-01'),
    userId: 'user-1',
    productId: 'p1',
    variantId: null,
    product: product(),
    variant: null,
    ...overrides,
  });

  const percentOffer = {
    id: 'offer-1',
    title: '20% off',
    offerType: 'PERCENTAGE' as const,
    offerValue: 20,
    productIds: new Set(['p1']),
    brandIds: new Set<string>(),
    categoryIds: new Set<string>(),
  };

  beforeEach(async () => {
    prisma = {
      product: { findUnique: jest.fn().mockResolvedValue(product()) },
      productVariant: { findUnique: jest.fn() },
      cartItem: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };

    offersService = {
      getActiveOffersForResolution: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: PrismaService, useValue: prisma },
        { provide: OffersService, useValue: offersService },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCart', () => {
    it('returns an empty cart when the user has no items', async () => {
      const result = await service.getCart('user-1');

      expect(result.data.items).toEqual([]);
      expect(result.data.subtotal).toBe(0);
      expect(result.data.totalItems).toBe(0);
    });

    it('totals quantity and line totals', async () => {
      prisma.cartItem.findMany.mockResolvedValue([
        storedItem({ id: 'ci1', quantity: 2 }),
        storedItem({
          id: 'ci2',
          quantity: 3,
          product: product({ id: 'p2', price: 50 }),
        }),
      ]);

      const result = await service.getCart('user-1');

      expect(result.data.totalItems).toBe(5);
      expect(result.data.subtotal).toBe(350);
    });

    it('uses the variant price override over the product base price', async () => {
      prisma.cartItem.findMany.mockResolvedValue([
        storedItem({
          variantId: 'v1',
          variant: {
            id: 'v1',
            isActive: true,
            priceOverride: 80,
            stockOverride: null,
          },
        }),
      ]);

      const result = await service.getCart('user-1');

      expect(result.data.items[0].unitPrice).toBe(80);
      expect(result.data.items[0].originalPrice).toBe(80);
    });

    it('applies the best active offer to the variant price', async () => {
      offersService.getActiveOffersForResolution.mockResolvedValue([
        percentOffer,
      ]);
      prisma.cartItem.findMany.mockResolvedValue([
        storedItem({
          variantId: 'v1',
          variant: {
            id: 'v1',
            isActive: true,
            priceOverride: 100,
            stockOverride: null,
          },
        }),
      ]);

      const result = await service.getCart('user-1');
      const item = result.data.items[0];

      expect(item.unitPrice).toBe(80);
      expect(item.originalPrice).toBe(100);
      expect(item.appliedOffer).toEqual({ id: 'offer-1', title: '20% off' });
      expect(item.onSale).toBe(true);
    });

    it('flags inactive products as unavailable', async () => {
      prisma.cartItem.findMany.mockResolvedValue([
        storedItem({ product: product({ isActive: false }) }),
      ]);

      const result = await service.getCart('user-1');

      expect(result.data.items[0].isAvailable).toBe(false);
    });

    it('falls back to variant stock override for availability', async () => {
      prisma.cartItem.findMany.mockResolvedValue([
        storedItem({
          variantId: 'v1',
          variant: {
            id: 'v1',
            isActive: true,
            priceOverride: null,
            stockOverride: 0,
          },
        }),
      ]);

      const result = await service.getCart('user-1');
      const item = result.data.items[0];

      expect(item.availableStock).toBe(0);
      expect(item.isAvailable).toBe(false);
    });
  });

  describe('addToCart', () => {
    const dto: AddToCartDto = { productId: 'p1' };

    it('creates a row when the product is not in the cart yet', async () => {
      const created = storedItem({ quantity: 1 });
      prisma.cartItem.create.mockResolvedValue(created);

      const result = await service.addToCart('user-1', dto);

      expect(prisma.cartItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            userId: 'user-1',
            productId: 'p1',
            variantId: null,
            quantity: 1,
          },
        }),
      );
      expect(result.data.id).toBe('ci1');
    });

    it('increments quantity when the row already exists', async () => {
      prisma.cartItem.findFirst.mockResolvedValue(storedItem({ quantity: 2 }));
      prisma.cartItem.update.mockResolvedValue(storedItem({ quantity: 4 }));

      await service.addToCart('user-1', { productId: 'p1', quantity: 2 });

      expect(prisma.cartItem.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { quantity: 4 } }),
      );
    });

    it('rejects an inactive product', async () => {
      prisma.product.findUnique.mockResolvedValue(product({ isActive: false }));

      await expect(service.addToCart('user-1', dto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('rejects a missing product', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.addToCart('user-1', dto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('rejects a variant belonging to another product', async () => {
      prisma.productVariant.findUnique.mockResolvedValue(
        variant({ productId: 'other' }),
      );

      await expect(
        service.addToCart('user-1', { productId: 'p1', variantId: 'v1' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an inactive variant', async () => {
      prisma.productVariant.findUnique.mockResolvedValue(
        variant({ isActive: false }),
      );

      await expect(
        service.addToCart('user-1', { productId: 'p1', variantId: 'v1' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a quantity above product stock', async () => {
      prisma.product.findUnique.mockResolvedValue(product({ stock: 3 }));

      await expect(
        service.addToCart('user-1', { productId: 'p1', quantity: 5 }),
      ).rejects.toThrow('Only 3 left in stock');
    });

    it('rejects a quantity above variant stock override', async () => {
      prisma.productVariant.findUnique.mockResolvedValue(
        variant({ stockOverride: 2 }),
      );

      await expect(
        service.addToCart('user-1', {
          productId: 'p1',
          variantId: 'v1',
          quantity: 3,
        }),
      ).rejects.toThrow('Only 2 left in stock');
    });

    it('rejects when the merged quantity exceeds stock', async () => {
      prisma.cartItem.findFirst.mockResolvedValue(storedItem({ quantity: 9 }));

      await expect(
        service.addToCart('user-1', { productId: 'p1', quantity: 2 }),
      ).rejects.toThrow('Only 10 left in stock');
    });
  });

  describe('updateCartItem', () => {
    it('updates the quantity for the owner', async () => {
      prisma.cartItem.findUnique.mockResolvedValue(storedItem());
      prisma.cartItem.update.mockResolvedValue(storedItem({ quantity: 3 }));

      const result = await service.updateCartItem('user-1', 'ci1', {
        quantity: 3,
      });

      expect(prisma.cartItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ci1' },
          data: { quantity: 3 },
        }),
      );
      expect(result.data.quantity).toBe(3);
    });

    it('rejects when the row belongs to another user', async () => {
      prisma.cartItem.findUnique.mockResolvedValue(
        storedItem({ userId: 'someone-else' }),
      );

      await expect(
        service.updateCartItem('user-1', 'ci1', { quantity: 1 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects when the row is missing', async () => {
      prisma.cartItem.findUnique.mockResolvedValue(null);

      await expect(
        service.updateCartItem('user-1', 'ci1', { quantity: 1 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects a quantity above available stock', async () => {
      prisma.cartItem.findUnique.mockResolvedValue(
        storedItem({ product: product({ stock: 2 }) }),
      );

      await expect(
        service.updateCartItem('user-1', 'ci1', { quantity: 5 }),
      ).rejects.toThrow('Only 2 left in stock');
    });
  });

  describe('removeCartItem', () => {
    it('deletes the row owned by the user', async () => {
      prisma.cartItem.findUnique.mockResolvedValue(storedItem());

      await service.removeCartItem('user-1', 'ci1');

      expect(prisma.cartItem.delete).toHaveBeenCalledWith({
        where: { id: 'ci1' },
      });
    });

    it('rejects when the row belongs to another user', async () => {
      prisma.cartItem.findUnique.mockResolvedValue(
        storedItem({ userId: 'someone-else' }),
      );

      await expect(
        service.removeCartItem('user-1', 'ci1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.cartItem.delete).not.toHaveBeenCalled();
    });
  });

  describe('clearCart', () => {
    it('deletes every row for the user', async () => {
      await service.clearCart('user-1');

      expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });
  });
});
