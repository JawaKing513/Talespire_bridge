const http = require("http");
const { PassThrough } = require("stream");

const PORT = 9000; // The public port
let localServerUrl = null; // Set via the /bridge command

const server = http.createServer((req, res) => {
  if (!localServerUrl) {
    res.writeHead(503);
    res.end("Bridge not established. Local server is offline.");
    return;
  }

  // Forward the request to the Local Server
  const proxyReq = http.request(`${localServerUrl}${req.url}`, {
    method: req.method,
    headers: req.headers
  }, (proxyRes) => {
    // Forward the status and headers back to the user
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    // Pipe the data (works for files, JSON, and SSE streams!)
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (e) => {
    res.writeHead(502);
    res.end("Local server unreachable.");
  });

  req.pipe(proxyReq); // Forward post data
});

// Endpoint for the local server to register itself
server.on('request', (req, res) => {
  if (req.url === '/register-bridge' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const data = JSON.parse(body);
      localServerUrl = data.localUrl;
      console.log(`Bridge established! Forwarding to: ${localServerUrl}`);
      res.end("Bridge Registered");
    });
  }
});

server.listen(PORT, () => console.log(`Gateway listening on port ${PORT}`));