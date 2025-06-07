const express = require('express');
const app = express();

// Simple test route to check if regions API should work
app.get('/test-regions', async (req, res) => {
  try {
    const response = await fetch('http://localhost:5000/api/regions', {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    const contentType = response.headers.get('content-type');
    const text = await response.text();
    
    console.log('Response status:', response.status);
    console.log('Content-Type:', contentType);
    console.log('Response body (first 200 chars):', text.substring(0, 200));
    
    res.json({
      status: response.status,
      contentType,
      isHTML: text.includes('<!DOCTYPE html>'),
      bodyPreview: text.substring(0, 200)
    });
  } catch (error) {
    res.json({ error: error.message });
  }
});

app.listen(3001, () => {
  console.log('Test server running on port 3001');
});