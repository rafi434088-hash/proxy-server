const net = require('net');
const http = require('http');

const server = http.createServer((req, res) => {
  // Health check של Render
  if (req.url === '/' || !req.url.startsWith('http')) {
    res.writeHead(200);
    res.end('Proxy OK');
    return;
  }

  const targetUrl = new URL(req.url);
  
  const options = {
    hostname: targetUrl.hostname,
    port: targetUrl.port || 80,
    path: targetUrl.pathname + targetUrl.search,
    method: req.method,
    headers: req.headers
  };

  const proxy = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxy.on('error', (err) => {
    res.writeHead(500);
    res.end(err.message);
  });

  req.pipe(proxy);
});

// HTTPS CONNECT tunneling
server.on('connect', (req, clientSocket, head) => {
  const [hostname, port] = req.url.split(':');
  const targetPort = parseInt(port) || 443;

  console.log(`CONNECT ${hostname}:${targetPort}`);

  const serverSocket = net.createConnection(targetPort, hostname, () => {
    clientSocket.write(
      'HTTP/1.1 200 Connection Established\r\n' +
      'Proxy-agent: Node-Proxy\r\n' +
      '\r\n'
    );
    
    if (head && head.length > 0) {
      serverSocket.write(head);
    }
    
    serverSocket.pipe(clientSocket);
    clientSocket.pipe(serverSocket);
  });

  serverSocket.on('error', (err) => {
    console.error('Server socket error:', err.message);
    clientSocket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n');
    clientSocket.destroy();
  });

  clientSocket.on('error', (err) => {
    console.error('Client socket error:', err.message);
    serverSocket.destroy();
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Proxy server running on port ${PORT}`);
});
