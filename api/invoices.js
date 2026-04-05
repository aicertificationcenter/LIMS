import { prisma } from './lib/prisma.js';

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
    console.log(`[API] Creating invoice for sampleId: ${sampleId}, invoiceNo: ${invoiceNo}`);
    
    try {
      const result = await prisma.$transaction(async (tx) => {
        // 1. Create or Update Invoice
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
          },
          include: { items: true }
        });
        
        // 2. Explicitly update Sample status to QUOTED
        await tx.sample.update({
          where: { id: sampleId },
          data: { status: 'QUOTED' }
        });
        
        console.log(`[API] Successfully updated sample ${sampleId} to QUOTED status.`);
        return inv;
      }, {
        timeout: 10000 // 10s timeout for safety
      });

      return res.status(200).json(result);
    } catch (error) {
      console.error('[API Error] Invoice creation failed:', error);
      return res.status(500).json({ message: '견적서 저장 및 상태 업데이트 실패', error: error.message });
    }
  }
}
