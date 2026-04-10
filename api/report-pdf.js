import { prisma } from './lib/prisma.js';

export default async function handler(req, res) {
  const { method } = req;
  const { id } = req.query;

  if (method === 'GET') {
    if (!id) {
      return res.status(400).send('ID is required');
    }

    try {
      const sample = await prisma.sample.findUnique({
        where: { id },
        select: { reportPdfUrl: true }
      });

      if (!sample || !sample.reportPdfUrl) {
        return res.status(404).send('PDF not found');
      }

      if (sample.reportPdfUrl.startsWith('http')) {
        return res.redirect(302, sample.reportPdfUrl);
      }

      // If it's a data URL, strip the prefix and decode base64
      let base64Data = sample.reportPdfUrl;
      const dataUrlPrefix = 'data:application/pdf;base64,';
      if (base64Data.startsWith(dataUrlPrefix)) {
        base64Data = base64Data.replace(dataUrlPrefix, '');
      } else if (base64Data.startsWith('data:')) {
        base64Data = base64Data.split(',')[1];
      }

      const buffer = Buffer.from(base64Data, 'base64');

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="report_${id}.pdf"`);
      return res.status(200).send(buffer);
    } catch (error) {
      return res.status(500).send('Error retrieving PDF');
    }
  }

  if (method === 'PATCH') {
    const { id: bodyId, chunk, isFirst } = req.body;
    const targetId = bodyId || id;
    
    if (!targetId || !chunk) {
      return res.status(400).send('Invalid payload: id and chunk are required');
    }

    try {
      if (isFirst) {
        await prisma.sample.update({
          where: { id: targetId },
          data: { reportPdfUrl: chunk }
        });
      } else {
        const sample = await prisma.sample.findUnique({ where: { id: targetId }, select: { reportPdfUrl: true } });
        await prisma.sample.update({
          where: { id: targetId },
          data: { reportPdfUrl: (sample.reportPdfUrl || '') + chunk }
        });
      }
      return res.status(200).json({ success: true });
    } catch (e) {
      return res.status(500).json({ message: 'Chunk upload failed', error: e.message });
    }
  }

  return res.status(405).send('Method Not Allowed');
}
