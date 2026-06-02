const net = require('net');
const http = require('http');
const url = require('url');

const server = http.createServer((req, res) => {
  // HTTP רגיל
  const options = url.parse(req.url);
  const proxy = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });
  req.pipe(proxy);
  proxy.on('error', (err) => {
    res.writeHead(500);
    res.end(err.message);
  });
});

// HTTPS tunneling - זה מה שחסר בפרוקסי הישן
server.on('connect', (req, clientSocket, head) => {
  const { hostname, port } = url.parse(`https://${req.url}`);
  
  const serverSocket = net.connect(port || 443, hostname, () => {
    clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
    serverSocket.write(head);
    serverSocket.pipe(clientSocket);
    clientSocket.pipe(serverSocket);
  });

  serverSocket.on('error', (err) => {
    clientSocket.end();
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Proxy running on port ${PORT}`);
});
