import { prisma } from './lib/prisma.js';

export default async function handler(req, res) {
  const { sampleId } = req.query;

  if (req.method === 'GET') {
    if (!sampleId) return res.status(400).json({ message: 'sampleId is required' });

    try {
      const logs = await prisma.auditLog.findMany({
        where: {
          tableName: 'Sample',
          recordId: sampleId
        },
        orderBy: { timestamp: 'desc' },
        include: {
          changedBy: {
            select: { name: true }
          }
        }
      });
      return res.status(200).json(logs);
    } catch (err) {
      return res.status(500).json({ message: '이력 조회 실패', error: err.message });
    }
  }

  return res.status(405).send('Method Not Allowed');
}
