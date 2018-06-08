const {assert} = require('chai');
const Homee = require('../homee');
const http = require('./MockHttpServer');

describe('02 access_token', () => {

    describe('#access_token', () => {

        it('should query an access token', () => {
            const homee = new Homee('127.0.0.1', 'userxy', 'super-secret');

            return homee._getAccessToken().then((token) => {
                assert.equal(token, 'e663e30818201d28dd07803e57333bed4f15803a');
            })
        })


    })
})
