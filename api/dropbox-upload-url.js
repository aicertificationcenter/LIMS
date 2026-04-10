import { prisma } from './lib/prisma.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const { id } = req.body;
  if (!id) return res.status(400).json({ message: 'Test ID is required' });

  try {
    const sample = await prisma.sample.findUnique({ where: { id }, select: { barcode: true } });
    if (!sample) return res.status(404).json({ message: 'Test not found' });

    const dropboxToken = process.env.DROPBOX_ACCESS_TOKEN;
    if (!dropboxToken) return res.status(500).json({ message: 'Dropbox Token missing' });

    // Dropbox API: get_temporary_upload_link
    const dropRes = await fetch('https://api.dropboxapi.com/2/files/get_temporary_upload_link', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${dropboxToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        commit_info: {
          path: `/LIMS_Reports/${sample.barcode}_최종성적서.pdf`,
          mode: { '.tag': 'overwrite' },
          autorename: true,
          mute: false,
          strict_conflict: false
        },
        duration: 3600
      })
    });

    if (!dropRes.ok) {
      const dropErr = await dropRes.text();
      return res.status(502).json({ message: 'Dropbox API error', error: dropErr });
    }

    const dropData = await dropRes.json();
    return res.status(200).json({ link: dropData.link, path: `/LIMS_Reports/${sample.barcode}_최종성적서.pdf` });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to generate upload link', error: err.message });
  }
}
