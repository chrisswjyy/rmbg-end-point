const axios = require('axios');
const FormData = require('form-data');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageData } = req.body;

    if (!imageData) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    // Convert base64 to buffer
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Upload to Catbox
    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('fileToUpload', buffer, {
      filename: 'image.jpg',
      contentType: 'image/jpeg'
    });

    const catboxResponse = await axios.post('https://catbox.moe/user/api.php', formData, {
      headers: formData.getHeaders(),
      maxBodyLength: Infinity,
      timeout: 30000
    });

    const imageUrl = catboxResponse.data;

    if (!imageUrl || !imageUrl.startsWith('http')) {
      throw new Error('Failed to upload to Catbox');
    }

    // Remove background using the API
    const removeBgUrl = `https://api.elrayyxml.web.id/api/tools/removebg?url=${encodeURIComponent(imageUrl)}`;
    
    const removeBgResponse = await axios.get(removeBgUrl, {
      timeout: 60000
    });

    if (removeBgResponse.data && removeBgResponse.data.result) {
      return res.status(200).json({
        success: true,
        result: removeBgResponse.data.result
      });
    } else {
      throw new Error('Invalid response from remove background API');
    }

  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({ 
      error: 'Failed to process image',
      details: error.message 
    });
  }
};