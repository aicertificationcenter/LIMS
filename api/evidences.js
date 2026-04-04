import { prisma } from './lib/prisma.js';

export default async function handler(req, res) {
  const { method } = req;

  if (method === 'POST') {
    const { sampleId, uploaderId, fileName, fileType, dataUrl } = req.body;
    try {
      const newEvidence = await prisma.evidence.create({
        data: { sampleId, uploaderId, fileName, fileType, dataUrl }
      });
      return res.status(201).json(newEvidence);
    } catch (error) {
      return res.status(500).json({ message: '증적 업로드 실패', error: error.message });
    }
  }

  if (method === 'GET') {
    const { sampleId } = req.query;
    try {
      const list = await prisma.evidence.findMany({
        where: { sampleId },
        orderBy: { createdAt: 'desc' },
      });
      return res.status(200).json(list);
    } catch (error) {
      return res.status(500).json({ message: '증적 조회 실패', error: error.message });
    }
  }

  if (method === 'DELETE') {
    const { id } = req.body;
    try {
      await prisma.evidence.delete({
        where: { id }
      });
      return res.status(200).json({ message: '증적 삭제 성공' });
    } catch (error) {
      return res.status(500).json({ message: '증적 삭제 실패', error: error.message });
    }
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
}
