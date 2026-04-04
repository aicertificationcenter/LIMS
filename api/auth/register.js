import { prisma } from '../lib/prisma.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { id, pw, email, phone, name } = req.body;

  try {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ id: id }, { email: email }]
      }
    });

    if (existing) {
      return res.status(400).json({ message: '이미 가입된 아이디 또는 이메일입니다.' });
    }

    const newUser = await prisma.user.create({
      data: {
        id,
        email,
        passwordHash: pw, // bcrypt.hashSync(pw, 10)
        name: name || `${id} 님`,
        role: 'PENDING', // default role
      }
    });

    const { passwordHash, ...safeUser } = newUser;
    return res.status(201).json(safeUser);
  } catch (error) {
    console.error('Register Error:', error);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.', error: error.message });
  }
}
