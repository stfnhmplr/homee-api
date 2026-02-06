const { expect } = require('chai');
const Homee = require('../homee');

const homee = new Homee('127.0.0.1', 'userxy', 'super-secret');

describe('02 connection', () => {
  describe('#access_token', () => {
    it('should query an access token', async () => {
      const accessToken = await homee.getAccessToken();
      expect(accessToken).to.equal('e663e30818201d28dd07803e57333bed4f15803a');
    });
  });

  describe('#connect via websocket', () => {
    it('can establish a websocket connection', async () => {
      await homee.connect();
      expect(homee.ws).to.be.an('object');
      expect(homee.ws.readyState).to.equal(1);
    });

    it('receives message via websocket and broadcast them', (done) => {
      const msg = { node: { id: 1 } };
      global.homeeMockup.send(JSON.stringify(msg));

      homee.on('message', (message) => {
        expect(message).to.eql(msg);
        done();
      });
    });

    it('handles invalid messages properly', (done) => {
      const msg = { node: { id: 1 } };
      global.homeeMockup.send(`x${JSON.stringify(msg)}`);

      homee.on('error', (message) => {
        expect(message).to.equal('Received unexpected message from websocket');
        done();
      });
    });
  });
});
