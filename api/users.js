import { prisma } from '../lib/prisma.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          pw: true, // For admin visibility during development
        }
      });
      return res.status(200).json(users);
    } catch (error) {
      return res.status(500).json({ message: '사용자 목록 조회 실패', error: error.message });
    }
  }

  if (req.method === 'PATCH') {
    const { id, role } = req.body;
    try {
      const updatedUser = await prisma.user.update({
        where: { id },
        data: { role },
      });
      return res.status(200).json(updatedUser);
    } catch (error) {
      return res.status(500).json({ message: '권한 변경 실패', error: error.message });
    }
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
}
