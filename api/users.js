import { prisma } from './lib/prisma.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        }
      });
      console.log(`[API] Fethced ${users.length} users from DB.`);
      return res.status(200).json(users);
    } catch (error) {
      console.error('[API Error] Fetch Users failed:', error.message);
      return res.status(500).json({ message: '사용자 목록 조회 실패', error: error.message });
    }
  }

  if (req.method === 'PATCH') {
    const { id, role, name } = req.body;
    try {
      const updatedUser = await prisma.user.update({
        where: { id },
        data: { role, name },
      });
      return res.status(200).json(updatedUser);
    } catch (error) {
      return res.status(500).json({ message: '사용자 정보 변경 실패', error: error.message });
    }
  }

  if (req.method === 'DELETE') {
    const { id } = req.body;
    try {
      // Check for existing performance data
      const testCount = await prisma.test.count({
        where: { testerId: id }
      });
      
      if (testCount > 0) {
        return res.status(403).json({ 
          message: '시험 수행 실적이 있는 사용자는 삭제할 수 없습니다. (권한 변경만 가능)' 
        });
      }

      await prisma.user.delete({
        where: { id },
      });
      return res.status(200).json({ message: '사용자 삭제 성공' });
    } catch (error) {
      return res.status(500).json({ message: '사용자 삭제 실패', error: error.message });
    }
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
}
