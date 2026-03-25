import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 4173;

const server = http.createServer((req, res) => {
  const filePath = path.resolve(__dirname, 'test-page.html');
  const content = fs.readFileSync(filePath, 'utf-8');
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(content);
});

server.listen(PORT, () => {
  console.log(`Test server running at http://localhost:${PORT}`);
});
