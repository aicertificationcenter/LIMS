import { prisma } from './lib/prisma.js';

export default async function handler(req, res) {
  const { method } = req;
  const { userId } = req.query; // For now, we take userId from query

  if (!userId) {
    return res.status(400).json({ message: 'userId is required' });
  }

  if (method === 'GET') {
    try {
      const notifications = await prisma.notification.findMany({
        where: { userId, read: false },
        orderBy: { createdAt: 'desc' },
      });
      return res.status(200).json(notifications);
    } catch (error) {
      return res.status(500).json({ message: '알림 조회 실패', error: error.message });
    }
  }

  if (method === 'PATCH') {
    try {
      await prisma.notification.updateMany({
        where: { userId, read: false },
        data: { read: true },
      });
      return res.status(200).json({ message: '모든 알림 읽음 처리 완료' });
    } catch (error) {
      return res.status(500).json({ message: '알림 업데이트 실패', error: error.message });
    }
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
}
