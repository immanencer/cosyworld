export async function uploadToImgur(imageBuffer, mimeType) {
    const apiUrl = 'https://api.imgur.com/3/image';
    const clientId = process.env['IMGUR_CLIENT_ID']; // Replace with your actual Imgur Client ID
  
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Client-ID ${clientId}`,
          'Content-Type': mimeType,
        },
        body: imageBuffer, // This should be the raw binary data of the image or video
      });
  
      const data = await response.json();
  
      if (data.success) {
        console.log('Image uploaded successfully:', data.data.link);
        return data.data.link; // Return the URL of the uploaded image/video
      } else {
        console.error('Imgur API error:', data);
        throw new Error('Failed to upload image to Imgur.');
      }
    } catch (error) {
      console.error('Error uploading image to Imgur:', error);
      throw error;
    }
  }