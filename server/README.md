# N2YO Proxy Server

This small Express server proxies selected N2YO REST API endpoints so your browser-based site can call the API without running into CORS restrictions. The server injects your `N2YO_API_KEY` from the environment and forwards the response to the client.

Setup

1. Change to the server folder:

```bash
cd "GitHub/api-project/server"
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file (or set env vars) using the `.env.example` as a guide:

```
N2YO_API_KEY=your_real_api_key_here
PORT=3000
```

4. Start the server:

```bash
npm start
```

Usage


Call the proxy endpoint with the rest of the N2YO path you need. Examples (replace YOUR_RENDER_URL with your deployed backend URL, e.g., https://api-project-xcg2.onrender.com):

- Get satellite positions (ISS = 25544) for observer lat/lon/alt and seconds:

```
GET https://YOUR_RENDER_URL/n2yo/sat/positions/25544/22.28552/114.15769/0/60
```

- Get satellite info:

```
GET https://YOUR_RENDER_URL/n2yo/sat/info/25544
```

Client example (browser JS)

```js
// positions example - adjust path/params as required by N2YO
fetch('https://YOUR_RENDER_URL/n2yo/sat/positions/25544/22.28552/114.15769/0/60')
  .then(r => r.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));
```

Security notes

- This proxy injects your API key from server-side env and should not be committed. Keep `.env` out of source control.
- The server restricts allowed N2YO path prefixes to reduce abuse; adjust `allowedPrefixes` in `index.js` as needed.
