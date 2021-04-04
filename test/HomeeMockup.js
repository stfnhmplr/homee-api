const http = require('http');
const url = require('url');
const WebSocket = require('ws');

class HomeeMockup {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.ws = new WebSocket.Server({ noServer: true });

    this.server = http.createServer((req, res) => {
      if (req.url === '/access_token') {
        res.end(`access_token=${this.accessToken}&user_id=23&device_id=1&expires=360`);
      } else {
        res.status = 404;
        res.end();
      }
    }).listen(7681);

    this.server.on('connection', (socket) => socket.unref());

    this.server.on('upgrade', (req, socket, head) => {
      if (url.parse(req.url).path === `/connection?access_token=${this.accessToken}`) {
        this.ws.handleUpgrade(req, socket, head, () => {
          this.ws.emit('connection', this.ws, req);
          this.ws.on('message', (msg) => this.handleMessage(msg));
        });
      } else {
        socket.destroy();
      }
    });
  }

  send(msg) {
    this.ws.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    });
  }

  close() {
    this.ws.close(() => {
      this.server.close();
      return Promise.resolve();
    });
  }
}

module.exports = HomeeMockup;
