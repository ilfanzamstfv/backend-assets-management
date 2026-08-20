import prisma from '../config/prisma.js';
import { buildPagedResponse, getPagination } from '../utils/http.js';

const configMap = {
  category: { label: 'Category' },
  location: { label: 'Location' },
  supplier: { label: 'Supplier' },
};

const createCrudHandlers = (modelName) => {
  const { label } = configMap[modelName];

  return {
    list: async (req, res) => {
      try {
        const { search } = req.query;
        const { page, limit, skip } = getPagination(req.query);
        const where = search
          ? {
              name: { contains: search, mode: 'insensitive' },
            }
          : {};

        const [data, total] = await Promise.all([
          prisma[modelName].findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
          }),
          prisma[modelName].count({ where }),
        ]);

        res.json({
          status: 'success',
          ...buildPagedResponse({ data, total, page, limit }),
        });
      } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
      }
    },

    getById: async (req, res) => {
      try {
        const entity = await prisma[modelName].findUnique({
          where: { id: Number(req.params.id) },
        });

        if (!entity) {
          return res.status(404).json({ status: 'error', message: `${label} not found` });
        }

        res.json({ status: 'success', data: entity });
      } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
      }
    },

    create: async (req, res) => {
      try {
        const entity = await prisma[modelName].create({
          data: req.body,
        });

        res.status(201).json({ status: 'success', data: entity });
      } catch (error) {
        if (error.code === 'P2002') {
          return res.status(409).json({ status: 'error', message: `${label} already exists` });
        }

        res.status(500).json({ status: 'error', message: error.message });
      }
    },

    update: async (req, res) => {
      try {
        const existing = await prisma[modelName].findUnique({
          where: { id: Number(req.params.id) },
        });

        if (!existing) {
          return res.status(404).json({ status: 'error', message: `${label} not found` });
        }

        const entity = await prisma[modelName].update({
          where: { id: Number(req.params.id) },
          data: req.body,
        });

        res.json({ status: 'success', data: entity });
      } catch (error) {
        if (error.code === 'P2002') {
          return res.status(409).json({ status: 'error', message: `${label} already exists` });
        }

        res.status(500).json({ status: 'error', message: error.message });
      }
    },

    remove: async (req, res) => {
      try {
        const existing = await prisma[modelName].findUnique({
          where: { id: Number(req.params.id) },
        });

        if (!existing) {
          return res.status(404).json({ status: 'error', message: `${label} not found` });
        }

        await prisma[modelName].delete({
          where: { id: Number(req.params.id) },
        });

        res.json({ status: 'success', message: `${label} deleted` });
      } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
      }
    },
  };
};

export const categoryController = createCrudHandlers('category');
export const locationController = createCrudHandlers('location');
export const supplierController = createCrudHandlers('supplier');
