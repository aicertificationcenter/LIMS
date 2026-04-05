
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  const { method } = req;

  if (method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${method} Not Allowed`);
  }

  try {
    const { subject, content, recipients, attachments } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ message: '수신자 목록이 올바르지 않습니다.' });
    }

    // SMTP Configuration
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'mail.aicerti.com',
      port: 465,
      secure: true, // Use SSL/TLS
      auth: {
        user: process.env.SMTP_USER || 'ai@aicerti.com',
        pass: process.env.SMTP_PASS
      }
    });

    // Send Mail (BCC for privacy)
    await transporter.sendMail({
      from: `"한국인공지능검증원" <${process.env.SMTP_USER || 'ai@aicerti.com'}>`,
      to: process.env.SMTP_USER || 'ai@aicerti.com', // Set sender as primary to avoid empty TO field
      bcc: recipients,
      subject: subject,
      text: content,
      html: `<div style="font-family: sans-serif; line-height: 1.6; color: #333;">${content.replace(/\n/g, '<br>')}</div>`,
      attachments: attachments ? attachments.map(a => ({
        filename: a.filename,
        content: Buffer.from(a.content, 'base64')
      })) : []
    });

    return res.status(200).json({ message: '공지 메일이 성공적으로 발송되었습니다.', count: recipients.length });
  } catch (error) {
    console.error('Email API Error:', error);
    return res.status(500).json({ message: '메일 발송에 실패했습니다.', error: error.message });
  }
}
