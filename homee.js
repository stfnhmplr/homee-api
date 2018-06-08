/**
 * created by stfnhmplr on 2017-01-17 - refactored 2018-03-08
 * control your Homee via websocket with node.js
 * @LICENSE MIT
 */

const WebSocket = require('ws');
const request = require('request');
const sha512 = require('sha512');
const EventEmitter = require('events')
const Enums = require('./lib/enums')

class Homee extends EventEmitter {

    /**
     *
     * @param host
     * @param user
     * @param password
     */
    constructor(host, user, password, device = 'homeeApi') {
        super();

        this._host = host;
        this._user = user;
        this._password = password;
        this._device = device;
        this._deviceId = device.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/\s+/g, '-').toLowerCase();

        this._ws = null;
        this._token = '';
        this._expires = '';
    }

    /**
     *
     * @returns {Promise<any>}
     * @private
     */
    _getAccessToken() {
        const options = {
            url: this._url() + '/access_token',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            form: {
                device_name: this._device,
                device_hardware_id: this._deviceId,
                device_os: 5, // Linux
                device_type: 3, // Desktop
                device_app: 1 // homee
            },
            auth: {
                user: this._user,
                pass: sha512(this._password).toString('hex')
            }
        };

        return new Promise((resolve, reject) => {
            if (this._token && this._expires > Date.now()) resolve(this._token);

            request.post(options, (err, res, body) => {
                if (!err) {
                    this._token = body.split('&')[0].split('=')[1];
                    this._expires = Date.now() + parseInt(body.split('&')[3].split('=')[1]);
                    resolve(this._token);
                } else {
                    reject(new Error('Homee: Error while receiving AccessToken: ' + err));
                }
            });
        });
    }

    /**
     * establish a connection to homee
     * @returns {Promise<any>}
     */
    connect() {
        return new Promise((resolve, reject) => {
            this._getAccessToken()
                .then((token) => {
                    this._ws = new WebSocket(this._wsUrl() + '/connection?access_token=' + token, {
                            protocol: 'v2',
                            protocolVersion: 13,
                            origin: this._url()
                        },
                        (err) => {
                            reject(new Error("Can't connect to homee ws" + err));
                        }
                    );

                    this._ws.on('open', () => {
                        resolve();
                        this.send('GET:all');
                    });

                    this._ws.on('message', (message) => {
                        this._handleMessage(message);
                    });

                    this._ws.on('close', (code) => {
                        this.emit('disconnect', code);
                    });

                    this._ws.on('error', (error) => {
                        this.emit('error', error);
                    });
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }

    /**
     * sends a raw message via websocket
     * @param {String}  message  the message, i.e. 'GET:nodes'
     */
    send(message) {
        this._ws.send(message, (err) => {
            if (err) this.emit('error', 'message could not be sent' + err);
        });
    }

    /**
     * handles icoming messages
     * @private
     */
    _handleMessage(message) {
        let m = JSON.parse(message);
        this.emit('message', m);
    }

    /**
     * update attribute values
     * PUT:/nodes/1/attributes/1?target_value=50.5
     * @param device_id
     * @param attribute_id
     * @param value
     */
    setValue(device_id, attribute_id, value) {
        if (typeof device_id !== 'number') {
            this.emit('error', 'device_id must be a number');
            return;
        }

        if (typeof attribute_id !== 'number') {
            this.emit('error', 'attribute_id must be a number');
            return;
        }

        if (typeof value !== 'number') {
            this.emit('error', 'value must be a number');
            return;
        }

        this.send(`PUT:/nodes/${device_id}/attributes/${attribute_id}?target_value=${value}`);
    }

    /**
     * generates the url
     * @returns {string}
     * @private
     */
    _url() {
        if (/^[0-z]{12}$/.test(this._host)) return `https://${this._host}.hom.ee`;

        return `http://${this._host}:7681`;
    }

    _wsUrl() {
        if (/^[0-z]{12}$/.test(this._host)) return `wss://${this._host}.hom.ee`;

        return `ws://${this._host}:7681`;
    }
}

module.exports = Homee;