import prisma from '../config/prisma.js';
import { buildPagedResponse, getPagination } from '../utils/http.js';

const purchaseInclude = {
  item: true,
  supplier: true,
  inputBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
};

const applyItemPurchaseSnapshot = async (tx, itemId, stockDelta = 0, supplierId) => {
  const item = await tx.item.findUnique({ where: { id: itemId } });
  if (!item) {
    throw new Error('Item not found');
  }

  const latestPurchase = await tx.purchaseHistory.findFirst({
    where: { itemId },
    orderBy: [{ purchaseDate: 'desc' }, { createdAt: 'desc' }],
  });

  await tx.item.update({
    where: { id: itemId },
    data: {
      stock: item.stock + stockDelta,
      ...(supplierId ? { supplierId } : {}),
      lastPurchasePrice: latestPurchase?.unitPrice ?? 0,
    },
  });
};

export const listPurchaseHistories = async (req, res) => {
  try {
    const { itemId, supplierId, startDate, endDate } = req.query;
    const { page, limit, skip } = getPagination(req.query);

    const where = {
      ...(itemId ? { itemId: Number(itemId) } : {}),
      ...(supplierId ? { supplierId: Number(supplierId) } : {}),
      ...((startDate || endDate)
        ? {
            purchaseDate: {
              ...(startDate ? { gte: new Date(startDate) } : {}),
              ...(endDate ? { lte: new Date(endDate) } : {}),
            },
          }
        : {}),
    };

    const [histories, total] = await Promise.all([
      prisma.purchaseHistory.findMany({
        where,
        include: purchaseInclude,
        orderBy: [{ purchaseDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.purchaseHistory.count({ where }),
    ]);

    res.json({
      status: 'success',
      ...buildPagedResponse({ data: histories, total, page, limit }),
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getPurchaseHistoryById = async (req, res) => {
  try {
    const history = await prisma.purchaseHistory.findUnique({
      where: { id: Number(req.params.id) },
      include: purchaseInclude,
    });

    if (!history) {
      return res.status(404).json({ status: 'error', message: 'Purchase history not found' });
    }

    res.json({ status: 'success', data: history });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const createPurchaseHistory = async (req, res) => {
  try {
    const quantity = Number(req.body.quantity);
    const unitPrice = Number(req.body.unitPrice);

    const result = await prisma.$transaction(async (tx) => {
      const history = await tx.purchaseHistory.create({
        data: {
          itemId: Number(req.body.itemId),
          supplierId: Number(req.body.supplierId),
          quantity,
          unitPrice,
          totalPrice: quantity * unitPrice,
          purchaseDate: new Date(req.body.purchaseDate),
          inputById: req.user.id,
          note: req.body.note,
        },
        include: purchaseInclude,
      });

      await applyItemPurchaseSnapshot(tx, history.itemId, quantity, history.supplierId);

      return history;
    });

    res.status(201).json({ status: 'success', data: result });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const updatePurchaseHistory = async (req, res) => {
  try {
    const purchaseId = Number(req.params.id);
    const quantity = Number(req.body.quantity);
    const unitPrice = Number(req.body.unitPrice);

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.purchaseHistory.findUnique({ where: { id: purchaseId } });
      if (!existing) {
        throw new Error('Purchase history not found');
      }

      const updated = await tx.purchaseHistory.update({
        where: { id: purchaseId },
        data: {
          itemId: req.body.itemId !== undefined ? Number(req.body.itemId) : existing.itemId,
          supplierId: req.body.supplierId !== undefined ? Number(req.body.supplierId) : existing.supplierId,
          quantity: req.body.quantity !== undefined ? quantity : existing.quantity,
          unitPrice: req.body.unitPrice !== undefined ? unitPrice : Number(existing.unitPrice),
          totalPrice:
            (req.body.quantity !== undefined ? quantity : existing.quantity) *
            (req.body.unitPrice !== undefined ? unitPrice : Number(existing.unitPrice)),
          purchaseDate: req.body.purchaseDate ? new Date(req.body.purchaseDate) : existing.purchaseDate,
          note: req.body.note !== undefined ? req.body.note : existing.note,
        },
        include: purchaseInclude,
      });

      if (existing.itemId === updated.itemId) {
        await applyItemPurchaseSnapshot(
          tx,
          existing.itemId,
          updated.quantity - existing.quantity,
          updated.supplierId
        );
      } else {
        await applyItemPurchaseSnapshot(tx, existing.itemId, -existing.quantity);
        await applyItemPurchaseSnapshot(tx, updated.itemId, updated.quantity, updated.supplierId);
      }

      return updated;
    });

    res.json({ status: 'success', data: result });
  } catch (error) {
    const status = error.message === 'Purchase history not found' ? 404 : 500;
    res.status(status).json({ status: 'error', message: error.message });
  }
};

export const deletePurchaseHistory = async (req, res) => {
  try {
    const purchaseId = Number(req.params.id);

    await prisma.$transaction(async (tx) => {
      const existing = await tx.purchaseHistory.findUnique({ where: { id: purchaseId } });
      if (!existing) {
        throw new Error('Purchase history not found');
      }

      await tx.purchaseHistory.delete({ where: { id: purchaseId } });
      await applyItemPurchaseSnapshot(tx, existing.itemId, -existing.quantity);
    });

    res.json({ status: 'success', message: 'Purchase history deleted' });
  } catch (error) {
    const status = error.message === 'Purchase history not found' ? 404 : 500;
    res.status(status).json({ status: 'error', message: error.message });
  }
};
