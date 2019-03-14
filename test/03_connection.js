const { assert } = require('chai');
const Homee = require('../homee');
const server = require('./MockHttpServer');
const WebsocketServer = require('ws').Server;
const url = require('url');

const homee = new Homee('127.0.0.1', 'userxy', 'super-secret');
const ws = new WebsocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
    if (
        url.parse(req.url).path ===
        '/connection?access_token=e663e30818201d28dd07803e57333bed4f15803a'
    ) {
        ws.handleUpgrade(req, socket, head, () => {
            ws.emit('connection', ws, req);
            ws.on('message', () => {
                ws.send(message);
            });
        });
    } else {
        socket.destroy();
    }
});

describe('03 connection', () => {
    describe('#connect via websocket', () => {
        it('can establish a websocket connection', () => {
            return homee.connect();
        });
    });

    // TODO: test event listeners
});
