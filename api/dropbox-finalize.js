import { prisma } from './lib/prisma.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const { id, path, targetField } = req.body;
  if (!id || !path) return res.status(400).json({ message: 'ID and Path are required' });

  try {
    const dropboxToken = process.env.DROPBOX_ACCESS_TOKEN;
    
    // Create shared link for viewing
    const dropRes = await fetch('https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${dropboxToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        path: path,
        settings: {
          requested_visibility: 'public'
        }
      })
    });

    let sharedUrl = '';
    
    if (!dropRes.ok) {
      const dropErrData = await dropRes.json().catch(() => ({}));
      // If link already exists, Dropbox throws shared_link_already_exists error. We can fetch it.
      if (dropErrData?.error?.['.tag'] === 'shared_link_already_exists') {
        const existingLinksRes = await fetch('https://api.dropboxapi.com/2/sharing/list_shared_links', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${dropboxToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ path: path })
        });
        const existingLinksData = await existingLinksRes.json();
        if (existingLinksData.links && existingLinksData.links.length > 0) {
          sharedUrl = existingLinksData.links[0].url;
        } else {
          return res.status(502).json({ message: 'Cannot retrieve existing shared link' });
        }
      } else {
        return res.status(502).json({ message: 'Dropbox Link creation failed', error: dropErrData });
      }
    } else {
      const dropData = await dropRes.json();
      sharedUrl = dropData.url;
    }

    // Save shared URL to DB
    const field = targetField || 'reportPdfUrl';
    
    await prisma.sample.update({
      where: { id },
      data: { [field]: sharedUrl }
    });

    return res.status(200).json({ success: true, url: sharedUrl });

  } catch (err) {
    return res.status(500).json({ message: 'Failed to finalize dropbox upload', error: err.message });
  }
}
