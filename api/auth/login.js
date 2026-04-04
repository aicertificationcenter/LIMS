import { prisma } from '../lib/prisma.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { id, pw } = req.body;

  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: id },
          { email: id } // allow login by id or email
        ]
      }
    });

    if (!user) {
      return res.status(401).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    if (user.passwordHash !== pw) { // 실제 운영 시 bcrypt.compare 필요
      return res.status(401).json({ message: '비밀번호가 일치하지 않습니다.' });
    }

    if (user.role === 'PENDING') {
      return res.status(403).json({ message: '관리자 승인 대기중입니다.' });
    }

    if (user.role === 'RESIGNED') {
      return res.status(403).json({ message: '퇴사 처리된 계정입니다.' });
    }

    // Success - return user info (omit password)
    const { passwordHash, ...safeUser } = user;
    return res.status(200).json(safeUser);
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.', error: error.message });
  }
}
