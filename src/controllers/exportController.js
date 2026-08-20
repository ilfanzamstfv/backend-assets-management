import prisma from '../config/prisma.js';
import { createSimplePdfBuffer } from '../utils/pdf.js';

export const exportItemPdf = async (req, res) => {
  try {
    const item = await prisma.item.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        category: true,
        purchaseHistories: {
          orderBy: [{ purchaseDate: 'desc' }, { createdAt: 'desc' }],
          take: 5,
        },
      },
    });

    if (!item) {
      return res.status(404).json({ status: 'error', message: 'Item not found' });
    }

    const latestPurchase = item.purchaseHistories[0] || null;
    const pdfBuffer = createSimplePdfBuffer(`Item Detail - ${item.name}`, [
      `SKU: ${item.sku}`,
      `Category: ${item.category?.name || '-'}`,
      `Stock: ${item.stock} ${item.unit}`,
      `Last Purchase Date: ${latestPurchase ? latestPurchase.purchaseDate.toISOString().slice(0, 10) : '-'}`,
      `Last Purchase Price: ${Number(item.lastPurchasePrice).toFixed(2)}`,
    ]);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="item-${item.id}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
