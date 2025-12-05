const axios = require('axios');
const FormData = require('form-data');

module.exports = async (req, res) => {
  // CORS Headers - Must be set first
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      allowedMethod: 'POST' 
    });
  }

  let imageData;

  try {
    // Parse body if needed
    if (typeof req.body === 'string') {
      const parsed = JSON.parse(req.body);
      imageData = parsed.imageData;
    } else {
      imageData = req.body?.imageData;
    }

    if (!imageData) {
      return res.status(400).json({ 
        error: 'No image data provided',
        received: typeof req.body 
      });
    }

    console.log('Processing image...');

    // Convert base64 to buffer
    const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    console.log('Buffer size:', buffer.length);
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
      throw new Error('Failed to upload to Catbox: ' + imageUrl);
    }

    console.log('Removing background...');

    // Remove background using the API
    const removeBgUrl = `https://api.elrayyxml.web.id/api/tools/removebg?url=${encodeURIComponent(imageUrl)}`;
    
    const removeBgResponse = await axios.get(removeBgUrl, {
      timeout: 60000,
      validateStatus: function (status) {
        return status < 500; // Accept any status less than 500
      }
    });

    console.log('Remove BG Status:', removeBgResponse.status);
    console.log('Remove BG Response:', removeBgResponse.data);

    if (removeBgResponse.data && removeBgResponse.data.result) {
      return res.status(200).json({
        success: true,
        result: removeBgResponse.data.result,
        originalUrl: imageUrl
      });
    } else {
      throw new Error('Invalid response from remove background API: ' + JSON.stringify(removeBgResponse.data));
    }

  } catch (error) {
    console.error('Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    
    return res.status(500).json({ 
      error: 'Failed to process image',
      details: error.message,
      stage: error.config?.url ? 'API call' : 'Processing',
      timestamp: new Date().toISOString()
    });
  }
};