const cors = require('cors');
const express = require('express');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const N2YO_API_KEY = process.env.N2YO_API_KEY;

if (!N2YO_API_KEY) {
  console.warn('Warning: N2YO_API_KEY is not set. Set it in .env before starting the server.');
}

app.use(cors());

// Proxy endpoint: forwards allowed N2YO REST calls to n2yo.com
// Example: GET /n2yo/sat/positions/25544/22.28552/114.15769/0/60
app.get('/n2yo/*', async (req, res) => {
  try {
    const path = req.params[0]; // everything after /n2yo/
    if (!path) return res.status(400).json({ error: 'Missing path' });

    // Allow only common N2YO endpoints to reduce abuse surface
    const allowedPrefixes = [
      'satellite/positions',
      'satellite/above',
      'satellite/visualpasses',
      'satellite/info',
      'satellite/risetimes'
    ];
    if (!allowedPrefixes.some(p => path.startsWith(p))) {
      return res.status(403).json({ error: 'Endpoint not allowed by proxy' });
    }


    // Build base URL and collect query params
    const baseUrl = `https://api.n2yo.com/rest/v1/${path}`;
    const params = new URLSearchParams();
    // Copy all client query params first
    Object.entries(req.query).forEach(([k, v]) => {
      params.append(k, v);
    });
    // Always append apiKey last
    if (N2YO_API_KEY) params.append('apiKey', N2YO_API_KEY);
    const finalUrl = `${baseUrl}?${params.toString()}`;
    console.log('Proxying to N2YO:', finalUrl);

    const response = await fetch(finalUrl);
    const text = await response.text();

    // forward status and body; try to parse JSON if possible
    res.status(response.status);
    try {
      const json = JSON.parse(text);
      return res.json(json);
    } catch (err) {
      return res.send(text);
    }
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Proxy server error' });
  }
});

app.listen(PORT, () => console.log(`N2YO proxy listening on port ${PORT}`));
