import { prisma } from '../lib/prisma.js';

export default async function handler(req, res) {
  const { method } = req;

  switch (method) {
    case 'GET':
      try {
        const samples = await prisma.sample.findMany({
          orderBy: { receivedAt: 'desc' },
          include: {
            tests: {
              include: {
                tester: true
              }
            }
          }
        });
        return res.status(200).json(samples);
      } catch (error) {
        return res.status(500).json({ message: '리스트 조회 중 오류 발생', error: error.message });
      }

    case 'POST':
      try {
        const { client, clientName, phone, email, content, consultation } = req.body;
        
        // barcode 생성 logic (YYYYMMDD-seq)
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const count = await prisma.sample.count({
          where: { barcode: { startsWith: `KAIC_${dateStr}` } }
        });
        const seq = String(count + 1).padStart(3, '0');
        const barcode = `KAIC_${dateStr}_${seq}`;

        const newSample = await prisma.sample.create({
          data: {
            barcode,
            clientId: client,
            clientName,
            phone,
            email,
            content,
            consultation,
            status: 'RECEIVED'
          }
        });
        return res.status(201).json(newSample);
      } catch (error) {
        return res.status(500).json({ message: '등록 중 오류 발생', error: error.message });
      }

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).end(`Method ${method} Not Allowed`);
  }
}
