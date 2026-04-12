import { prisma } from './lib/prisma.js';
import { getDropboxToken } from './lib/dropbox.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const { id, type, extension = 'pdf' } = req.body;
  if (!id) return res.status(400).json({ message: 'Test ID is required' });

  try {
    const sample = await prisma.sample.findUnique({ where: { id }, select: { barcode: true } });
    if (!sample) return res.status(404).json({ message: 'Test not found' });

    const dropboxToken = await getDropboxToken();
    if (!dropboxToken) return res.status(500).json({ message: 'Dropbox Token missing in environment (DROPBOX_ACCESS_TOKEN or REFRESH info)' });

    // Determine path based on type
    let suffix = '최종성적서';
    if (type === 'BIZ_LICENSE') suffix = '사업자등록증';
    
    // Sanitize barcode to be safe for Dropbox paths
    const safeBarcode = (sample.barcode || 'Unknown').replace(/[\/\\:*?"<>|]/g, '_');
    
    // Clean extension if provided as .ext
    const cleanExt = (extension || 'pdf').replace('.', '');
    const filename = `${safeBarcode}_${suffix}.${cleanExt}`;
    const dropboxPath = `/LIMS_Reports/${filename}`;

    // Dropbox API: get_temporary_upload_link
    const dropRes = await fetch('https://api.dropboxapi.com/2/files/get_temporary_upload_link', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${dropboxToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        commit_info: {
          path: dropboxPath,
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
      console.error('[Dropbox API Error]', dropErr);
      return res.status(dropRes.status).json({ 
        message: 'Dropbox API error', 
        error: dropErr, 
        hint: 'Please check if the Dropbox Access Token is valid and has sufficient permissions.' 
      });
    }

    const dropData = await dropRes.json();
    return res.status(200).json({ link: dropData.link, path: dropboxPath });
  } catch (err) {
    console.error('[API Error] dropbox-upload-url:', err);
    return res.status(500).json({ message: 'Failed to generate upload link', error: err.message });
  }
}
