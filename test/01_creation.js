const {assert} = require('chai');
const Homee = require('../homee');

describe('01 creation', () => {

    describe('#device', () => {
        it('should have a default device-name', () => {
            const homee = new Homee('192.168.178.1', 'userxy', 'super-secret');

            assert.equal(homee._device, 'homeeApi');
        })

        it('should have a non default device-name if specified', () => {
            const homee = new Homee('192.168.178.1', 'userxy', 'super-secret', {device: 'sample device'});
            assert.equal(homee._device, 'sample device');
        });
    })

    describe('#device_id', () => {

        it('should have an kebab case default device-id', ()  => {
            const homee = new Homee('192.168.178.1', 'userxy', 'super-secret');

            assert.equal(homee._deviceId, 'homee-api');
        })

        it('should have a non default, kebab case device-id if specified', ()  => {
            const homee = new Homee('192.168.178.1', 'userxy', 'super-secret', {device: 'sample device'});

            assert.equal(homee._deviceId, 'sample-device');
        })
    })

    describe('#options', () => {
        it('should merge the options object with the default values', () => {
            const homee = new Homee('192.168.178.1', 'userxy', 'supersecret', {
                device: 'sample-device',
                reconnect: false
            });

            assert.equal(homee._reconnectInterval, 5000);
            assert.equal(homee._maxRetries, Infinity);
        })

        it('should have default options if no custom options provided', () => {
            const homee = new Homee('192.168.178.1', 'userxy', 'supersecret');

            assert.equal(homee._device, 'homeeApi');
            assert.equal(homee._shouldReconnect, true);
            assert.equal(homee._reconnectInterval, 5000);
            assert.equal(homee._maxRetries, Infinity);
        })
    })

    describe ('#url', () => {

        it('should have a local url if a ip adress is specified', () => {
            const homee = new Homee('192.168.178.1', 'userxy', 'super-secret');
            assert.equal(homee._url(), 'http://192.168.178.1:7681');
        })

        it('should have a remote url if a homee-id is specified', () => {
            const homee = new Homee('0123456789ab', 'userxy', 'super-secret');
            assert.equal(homee._url(), 'https://0123456789ab.hom.ee');
        })

        it('should have a local websocket url if a ip adress is specified', () => {
            const homee = new Homee('192.168.178.1', 'userxy', 'super-secret');
            assert.equal(homee._wsUrl(), 'ws://192.168.178.1:7681');
        })

        it('should have a remote websocket url if a homee-id is specified', () => {
            const homee = new Homee('0123456789ab', 'userxy', 'super-secret');
            assert.equal(homee._wsUrl(), 'wss://0123456789ab.hom.ee');
        })
    })
})
