import { prisma } from './lib/prisma.js';

export default async function handler(req, res) {
  const { method } = req;
  const { testerId } = req.query;

  if (method === 'GET') {
    if (!testerId) {
      return res.status(400).json({ message: 'testerId is required' });
    }

    try {
      const pdfSamplesRaw = await prisma.sample.findMany({
        where: { reportPdfUrl: { not: null } },
        select: { id: true }
      });
      const samplesWithPdf = new Set(pdfSamplesRaw.map(s => s.id));

      const tests = await prisma.test.findMany({
        where: { testerId },
        select: {
          startTime: true,
          sample: {
            select: {
              id: true, barcode: true, testerBarcode: true, status: true,
              clientId: true, clientName: true, phone: true, email: true,
              content: true, target: true, extra: true, consultation: true,
              testStartDate: true, testEndDate: true, testLocation: true,
              testType: true, testAddress: true, testProduct: true,
              testPurpose: true, testMethod: true, gapjiRejection: true,
              euljiRejection: true, formalBarcode: true, gapjiApproved: true,
              euljiApproved: true, receivedAt: true,
              consultations: true, evidences: true
            }
          }
        },
        orderBy: { startTime: 'desc' },
      });
      // Map it to the structure frontend expects
      const result = tests.map(t => ({
        id: t.sample.id,
        barcode: t.sample.barcode, // This is the receipt number
        testerBarcode: t.sample.testerBarcode,
        status: t.sample.status,
        client: t.sample.clientId,
        clientName: t.sample.clientName,
        phone: t.sample.phone,
        email: t.sample.email,
        content: t.sample.content,
        target: t.sample.target,
        extra: t.sample.extra,
        consultation: t.sample.consultation,
        consultations: t.sample.consultations,
        evidences: t.sample.evidences,
        testStartDate: t.sample.testStartDate,
        testEndDate: t.sample.testEndDate,
        testLocation: t.sample.testLocation,
        testType: t.sample.testType,
        testAddress: t.sample.testAddress,
        testProduct: t.sample.testProduct,
        testPurpose: t.sample.testPurpose,
        testMethod: t.sample.testMethod,
        reportPdfUrl: samplesWithPdf.has(t.sample.id) ? `/api/report-pdf?id=${t.sample.id}` : null,
        assignedAt: t.startTime,
        gapjiRejection: t.sample.gapjiRejection,
        euljiRejection: t.sample.euljiRejection,
        formalBarcode: t.sample.formalBarcode,
        gapjiApproved: t.sample.gapjiApproved,
        euljiApproved: t.sample.euljiApproved
      }));

      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({ message: '업무 조회 실패', error: error.message });
    }
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
}
