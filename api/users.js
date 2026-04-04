import { prisma } from '../lib/prisma.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      }
    });
    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({ message: '사용자 목록 조회 실패', error: error.message });
  }
}
