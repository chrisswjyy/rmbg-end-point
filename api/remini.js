const axios = require('axios');
const FormData = require('form-data');

module.exports = async (req, res) => {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageData } = req.body;

    if (!imageData) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    console.log('Processing image...');

    // Convert base64 to buffer
    const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    console.log('Uploading to Catbox...');

    // Upload to Catbox
    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('fileToUpload', buffer, {
      filename: 'image.png',
      contentType: 'image/png'
    });

    const catboxResponse = await axios.post('https://catbox.moe/user/api.php', formData, {
      headers: {
        ...formData.getHeaders()
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 30000
    });

    const imageUrl = catboxResponse.data.trim();
    console.log('Catbox URL:', imageUrl);

    if (!imageUrl || !imageUrl.startsWith('http')) {
      throw new Error('Failed to upload to Catbox');
    }

    console.log('Removing background...');

    // Remove background using the API
    const removeBgUrl = `https://api.elrayyxml.web.id/api/tools/removebg?url=${encodeURIComponent(imageUrl)}`;
    
    const removeBgResponse = await axios.get(removeBgUrl, {
      timeout: 60000
    });

    console.log('Remove BG Response:', removeBgResponse.data);

    if (removeBgResponse.data && removeBgResponse.data.result) {
      return res.status(200).json({
        success: true,
        result: removeBgResponse.data.result,
        originalUrl: imageUrl
      });
    } else {
      throw new Error('Invalid response from remove background API');
    }

  } catch (error) {
    console.error('Error details:', error.response?.data || error.message);
    return res.status(500).json({ 
      error: 'Failed to process image',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};