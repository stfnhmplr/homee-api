const { expect } = require('chai');
const Homee = require('../homee');

describe('01 creation', () => {
  describe('#device', () => {
    it('should have a default device-name', () => {
      const homee = new Homee('192.168.178.1', 'userxy', 'super-secret');
      expect(homee.device).to.equal('homeeApi');
    });

    it('should have a non default device-name if specified', () => {
      const homee = new Homee('192.168.178.1', 'userxy', 'super-secret', {
        device: 'sample device',
      });
      expect(homee.device).to.equal('sample device');
    });
  });

  describe('#device_id', () => {
    it('should have an kebab case default device-id', () => {
      const homee = new Homee('192.168.178.1', 'userxy', 'super-secret');

      expect(homee.deviceId).to.equal('homee-api');
    });

    it('should have a non default, kebab case device-id if specified', () => {
      const homee = new Homee('192.168.178.1', 'userxy', 'super-secret', {
        device: 'sample device',
      });

      expect(homee.deviceId).to.equal('sample-device');
    });
  });

  describe('#options', () => {
    it('should merge the options object with the default values', () => {
      const homee = new Homee('192.168.178.1', 'userxy', 'supersecret', {
        device: 'sample-device',
        reconnect: false,
      });

      expect(homee.reconnectInterval).to.equal(5000);
      expect(homee.maxRetries).to.equal(Infinity);
    });

    it('should have default options if no custom options provided', () => {
      const homee = new Homee('192.168.178.1', 'userxy', 'supersecret');

      expect(homee.device).to.equal('homeeApi');
      expect(homee.shouldReconnect).to.equal(true);
      expect(homee.reconnectInterval).to.equal(5000);
      expect(homee.maxRetries).to.equal(Infinity);
    });
  });

  describe('#url', () => {
    it('should have a local url if a ip adress is specified', () => {
      const homee = new Homee('192.168.178.1', 'userxy', 'super-secret');
      expect(homee.url()).to.equal('http://192.168.178.1:7681');
    });

    it('should have a remote url if a homee-id is specified', () => {
      const homee = new Homee('0123456789ab', 'userxy', 'super-secret');
      expect(homee.url()).to.equal('https://0123456789ab.hom.ee');
    });

    it('should have a local websocket url if a ip adress is specified', () => {
      const homee = new Homee('192.168.178.1', 'userxy', 'super-secret');
      expect(homee.wsUrl()).to.equal('ws://192.168.178.1:7681');
    });

    it('should have a remote websocket url if a homee-id is specified', () => {
      const homee = new Homee('0123456789ab', 'userxy', 'super-secret');
      expect(homee.wsUrl()).to.equal('wss://0123456789ab.hom.ee');
    });
  });
});
