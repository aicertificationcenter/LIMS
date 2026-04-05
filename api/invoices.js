
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const invoices = await prisma.invoice.findMany({
        include: { items: true, sample: true }
      });
      return res.status(200).json(invoices);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  if (req.method === 'POST') {
    const { sampleId, invoiceNo, items, subtotal, discountRate, discountAmt, vat, total } = req.body;
    try {
      const result = await prisma.$transaction(async (tx) => {
        const inv = await tx.invoice.upsert({
          where: { sampleId },
          create: {
            sampleId,
            invoiceNo,
            subtotal,
            discountRate,
            discountAmt,
            vat,
            total,
            items: {
              create: items.map(i => ({
                title: i.title,
                unitCost: i.unitCost,
                qty: i.qty,
                price: i.price
              }))
            }
          },
          update: {
            invoiceNo,
            subtotal,
            discountRate,
            discountAmt,
            vat,
            total,
            items: {
              deleteMany: {},
              create: items.map(i => ({
                title: i.title,
                unitCost: i.unitCost,
                qty: i.qty,
                price: i.price
              }))
            }
          }
        });
        
        // Update sample status to QUOTED
        await tx.sample.update({
          where: { id: sampleId },
          data: { status: 'QUOTED' }
        });
        
        return inv;
      });
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
}
