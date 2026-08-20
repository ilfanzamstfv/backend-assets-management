import prisma from '../config/prisma.js';

export const getDashboardSummary = async (_req, res) => {
  try {
    const [totalItems, items, recentPurchases, categoryGroups, locationGroups] = await Promise.all([
      prisma.item.count(),
      prisma.item.findMany({
        select: {
          stock: true,
          lastPurchasePrice: true,
        },
      }),
      prisma.purchaseHistory.findMany({
        include: {
          item: true,
          supplier: true,
          inputBy: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: [{ purchaseDate: 'desc' }, { createdAt: 'desc' }],
        take: 5,
      }),
      prisma.item.groupBy({
        by: ['categoryId'],
        _count: {
          _all: true,
        },
      }),
      prisma.item.groupBy({
        by: ['locationId'],
        _count: {
          _all: true,
        },
      }),
    ]);

    const [categories, locations] = await Promise.all([
      prisma.category.findMany(),
      prisma.location.findMany(),
    ]);

    const totalAssetValue = items.reduce(
      (sum, item) => sum + Number(item.lastPurchasePrice) * item.stock,
      0
    );

    const categoryNameMap = new Map(categories.map((category) => [category.id, category.name]));
    const locationNameMap = new Map(locations.map((location) => [location.id, location.name]));

    res.json({
      status: 'success',
      data: {
        totalItems,
        totalAssetValue,
        itemsByCategory: categoryGroups.map((group) => ({
          categoryId: group.categoryId,
          categoryName: categoryNameMap.get(group.categoryId) || 'Unknown',
          totalItems: group._count._all,
        })),
        itemsByLocation: locationGroups.map((group) => ({
          locationId: group.locationId,
          locationName: locationNameMap.get(group.locationId) || 'Unknown',
          totalItems: group._count._all,
        })),
        recentPurchases,
      },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
