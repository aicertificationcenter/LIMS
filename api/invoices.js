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
    const { sampleId, invoiceNo, items, subtotal, discountRate, discountAmt, discountType, vat, total } = req.body;
    console.log(`[API] Creating/Updating invoice for sampleId: ${sampleId}`);
    
    try {
      const result = await prisma.$transaction(async (tx) => {
        // 1. Generate new Invoice Number (접수번호_견적)
        const sample = await tx.sample.findUnique({ where: { id: sampleId } });
        if (!sample) throw new Error("Sample not found for invoice creation.");
        const generatedInvoiceNo = `${sample.barcode}_견적`;

        // 2. Get existing invoice to manage previousNos history
        const existingInvoice = await tx.invoice.findUnique({ where: { sampleId } });
        let updatedPreviousNos = existingInvoice?.previousNos || "";
        if (existingInvoice?.invoiceNo) {
          updatedPreviousNos = updatedPreviousNos 
            ? `${updatedPreviousNos}, ${existingInvoice.invoiceNo}`
            : existingInvoice.invoiceNo;
        }

        // 3. Create or Update Invoice
        const inv = await tx.invoice.upsert({
          where: { sampleId },
          create: {
            sampleId,
            invoiceNo: generatedInvoiceNo,
            subtotal,
            discountRate,
            discountAmt,
            discountType: discountType || "PERCENT",
            vat,
            total,
            previousNos: "",
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
            invoiceNo: generatedInvoiceNo,
            subtotal,
            discountRate,
            discountAmt,
            discountType: discountType || "PERCENT",
            vat,
            total,
            previousNos: updatedPreviousNos,
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
        
        // 4. Update Sample status to QUOTED
        await tx.sample.update({
          where: { id: sampleId },
          data: { status: 'QUOTED' }
        });
        
        console.log(`[API] Successfully updated sample ${sampleId} to QUOTED status with ID ${generatedInvoiceNo}`);
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
