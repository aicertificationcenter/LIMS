import { prisma } from './lib/prisma.js';

export default async function handler(req, res) {
  const { method } = req;

  if (method === 'POST') {
    const { sampleId, authorId, message } = req.body;
    try {
      const newConsult = await prisma.consultation.create({
        data: { sampleId, authorId, message }
      });
      return res.status(201).json(newConsult);
    } catch (error) {
      return res.status(500).json({ message: '기록 저장 실패', error: error.message });
    }
  }

  if (method === 'GET') {
    const { sampleId } = req.query;
    try {
      const list = await prisma.consultation.findMany({
        where: { sampleId },
        orderBy: { createdAt: 'desc' },
      });
      return res.status(200).json(list);
    } catch (error) {
      return res.status(500).json({ message: '기록 조회 실패', error: error.message });
    }
  }

  if (method === 'PATCH') {
    const { id, message, authorId } = req.body;
    try {
      const oldConsult = await prisma.consultation.findUnique({ where: { id } });
      const currentHistory = Array.isArray(oldConsult.history) ? oldConsult.history : [];
      
      const newHistoryEntry = {
        message: oldConsult.message,
        updatedAt: new Date().toISOString(),
        authorId: oldConsult.authorId
      };

      const updatedConsult = await prisma.consultation.update({
        where: { id },
        data: { 
          message,
          history: [...currentHistory, newHistoryEntry]
        }
      });
      return res.status(200).json(updatedConsult);
    } catch (error) {
      return res.status(500).json({ message: '수정 중 오류 발생', error: error.message });
    }
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
}
