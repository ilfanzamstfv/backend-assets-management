import prisma from '../config/prisma.js';
import { buildPagedResponse, getPagination } from '../utils/http.js';

const itemInclude = {
  category: true,
  location: true,
  supplier: true,
};

export const listItems = async (req, res) => {
  try {
    const { search, categoryId, locationId, supplierId, status } = req.query;
    const { page, limit, skip } = getPagination(req.query);

    const where = {
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { sku: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(categoryId ? { categoryId: Number(categoryId) } : {}),
      ...(locationId ? { locationId: Number(locationId) } : {}),
      ...(supplierId ? { supplierId: Number(supplierId) } : {}),
      ...(status ? { status } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where,
        include: itemInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.item.count({ where }),
    ]);

    res.json({
      status: 'success',
      ...buildPagedResponse({ data: items, total, page, limit }),
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getItemById = async (req, res) => {
  try {
    const item = await prisma.item.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        ...itemInclude,
        purchaseHistories: {
          include: {
            supplier: true,
            inputBy: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: [{ purchaseDate: 'desc' }, { createdAt: 'desc' }],
        },
      },
    });

    if (!item) {
      return res.status(404).json({ status: 'error', message: 'Item not found' });
    }

    res.json({ status: 'success', data: item });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const createItem = async (req, res) => {
  try {
    const item = await prisma.item.create({
      data: {
        name: req.body.name,
        sku: req.body.sku,
        categoryId: Number(req.body.categoryId),
        locationId: Number(req.body.locationId),
        supplierId: Number(req.body.supplierId),
        stock: Number(req.body.stock),
        unit: req.body.unit,
        lastPurchasePrice: req.body.lastPurchasePrice ?? 0,
        description: req.body.description,
        status: req.body.status || 'ACTIVE',
      },
      include: itemInclude,
    });

    res.status(201).json({ status: 'success', data: item });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ status: 'error', message: 'SKU already exists' });
    }

    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const updateItem = async (req, res) => {
  try {
    const existing = await prisma.item.findUnique({ where: { id: Number(req.params.id) } });
    if (!existing) {
      return res.status(404).json({ status: 'error', message: 'Item not found' });
    }

    const item = await prisma.item.update({
      where: { id: Number(req.params.id) },
      data: {
        ...(req.body.name !== undefined ? { name: req.body.name } : {}),
        ...(req.body.sku !== undefined ? { sku: req.body.sku } : {}),
        ...(req.body.categoryId !== undefined ? { categoryId: Number(req.body.categoryId) } : {}),
        ...(req.body.locationId !== undefined ? { locationId: Number(req.body.locationId) } : {}),
        ...(req.body.supplierId !== undefined ? { supplierId: Number(req.body.supplierId) } : {}),
        ...(req.body.stock !== undefined ? { stock: Number(req.body.stock) } : {}),
        ...(req.body.unit !== undefined ? { unit: req.body.unit } : {}),
        ...(req.body.lastPurchasePrice !== undefined
          ? { lastPurchasePrice: req.body.lastPurchasePrice }
          : {}),
        ...(req.body.description !== undefined ? { description: req.body.description } : {}),
        ...(req.body.status !== undefined ? { status: req.body.status } : {}),
      },
      include: itemInclude,
    });

    res.json({ status: 'success', data: item });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ status: 'error', message: 'SKU already exists' });
    }

    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const deleteItem = async (req, res) => {
  try {
    const existing = await prisma.item.findUnique({ where: { id: Number(req.params.id) } });
    if (!existing) {
      return res.status(404).json({ status: 'error', message: 'Item not found' });
    }

    const item = await prisma.item.update({
      where: { id: Number(req.params.id) },
      data: { status: 'INACTIVE' },
      include: itemInclude,
    });

    res.json({ status: 'success', data: item, message: 'Item archived successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const listStock = async (req, res) => {
  try {
    const { search, categoryId, locationId, sort = 'name' } = req.query;
    const { page, limit, skip } = getPagination(req.query);

    const orderBy =
      sort === 'highest-stock'
        ? { stock: 'desc' }
        : sort === 'lowest-stock'
          ? { stock: 'asc' }
          : { name: 'asc' };

    const where = {
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { sku: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(categoryId ? { categoryId: Number(categoryId) } : {}),
      ...(locationId ? { locationId: Number(locationId) } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where,
        include: itemInclude,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.item.count({ where }),
    ]);

    res.json({
      status: 'success',
      ...buildPagedResponse({ data: items, total, page, limit }),
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
