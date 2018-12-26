/**
 * created by stfnhmplr (info@himpler.com)
 * a homee-api-wrapper
 * @LICENSE MIT
 */

const WebSocket = require('ws');
const request = require('request');
const shajs = require('sha.js')
const EventEmitter = require('events')
const debug = require('debug')('homee');
const Enums = require('./lib/enums')

class Homee extends EventEmitter {

    /**
     *
     * @param host {string}
     * @param user {string}
     * @param password {string}
     * @param options {object}
     */
    constructor(host, user, password, customOptions = {}) {
        super();

        let options = {
            device: 'homeeApi',
            reconnect: true,
            reconnectInterval: 5000,
            maxRetries: Infinity
        }

        // merge options
        for (let attr in customOptions) {
            if (customOptions.hasOwnProperty(attr)) {
                options[attr] = customOptions[attr];
            }
        }

        this._host = host;
        this._user = user;
        this._password = password;
        this._device = options.device;
        this._deviceId = options.device.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/\s+/g, '-').toLowerCase();
        this._reconnectInterval = options.reconnectInterval;
        this._shouldReconnect = options.reconnect;
        this._maxRetries = options.maxRetries;

        this._nodes = [];
        this._groups = [];
        this._relationships = [];
        this._ws = null;
        this._token = '';
        this._expires = 0;
        this._connected = false;
        this._retries = 0;
        this._shouldClose = false;

        this.enums = Enums;
    }

    /**
     * query access token
     * @returns {Promise<any>}
     * @private
     */
    _getAccessToken() {
        debug('get access token')
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
                pass: shajs('sha512').update(this._password).digest('hex')
            }
        };

        return new Promise((resolve, reject) => {
            if (this._token && this._expires > Date.now()) {
                debug('token still valid')
                resolve(this._token);
            }
            request.post(options, (err, res, body) => {
                if (!err && res.statusCode === 200) {
                    this._token = body.split('&')[0].split('=')[1];
                    this._expires = Date.now() + parseInt(body.split('&')[3].split('=')[1])*1000;
                    debug('received access token, valid until: %s', new Date(this._expires).toISOString())
                    resolve(this._token);
                } else if (!err && res.statusCode !== 200) {
                    debug('cannot receive access token, received status %d', res.statusCode)
                    reject(new Error(`cannot receive access token, received status ${res.statusCode}`));
                } else {
                    debug('cannot receive access token, error %s', err)
                    reject(new Error(`cannot receive access token, error ${err}`));
                }
            });
        });
    }

    /**
     * connect to homee
     * @returns {Promise<any>}
     */
    connect() {
        this._shouldClose = false;

        return new Promise((resolve, reject) => {
            this._getAccessToken()
                .then((token) => {
                    this._openWs(resolve, reject);
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }

    /**
     * open a Websocket Connection to homee
     * @param resolve {function}
     * @param reject {function}
     * @private
     */
    _openWs(resolve, reject) {
        if (this._retries) {
            debug('reconnect attempt #%d', this._retries);
            this.emit('reconnect', this._retries);
        }

        if (this._retries++ > this._maxRetries) {
            debug('reached max retries %d', this._maxRetries)
            this.emit('maxRetries', this._maxRetries);
            return;
        }

        try {
            debug('trying to connect')
            this._ws = new WebSocket(this._wsUrl() + '/connection?access_token=' + this._token, [], {
                protocol: 'v2', protocolVersion: 13, origin: this._url(), handshakeTimeout: 5000
            });
        } catch (err) {
            debug('cannot open ws connection err: %s', err)
            if (typeof reject === 'function') reject(new Error('cannot connect to homee' + err));
            setTimeout(() => this._openWs(), this._reconnectInterval * this._retries)
        }

        this._ws.on('open', () => {
            if (typeof resolve === 'function') resolve();
            this._connected = true;
            this._retries = 1;

            this.emit('connected');
            debug('connected to homee');

            this._heartbeatHandler = this._startHearbeatHandler();
            this.send('GET:all');
        });

        this._ws.on('message', (message) => {
            this._handleMessage(message);
        });

        this._ws.on('close', (reason) => {
            if (!this._shouldClose && this._retries <= 1) debug('lost connection to homee');
            this._stopHeartbeathandler();

            this._connected = false;
            this._ws = null;

            this.emit('disconnected', reason);
            if (this._shouldReconnect && !this._shouldClose)
                setTimeout(() => this._openWs(), this._reconnectInterval * this._retries)
        });

        this._ws.on('error', (err) => {
            debug('Websocket %s', err)
            this.emit('error', err.toString());
        });
    }

    /**
     * sends a raw message via websocket
     * @param {String}  message  the message, i.e. 'GET:nodes'
     */
    send(message) {
        debug('sending message "%s" to homee', message)

        this._ws.send(message, (err) => {
            if (err) {
                debug('error sending message: %s', err)
                this.emit('error', 'message could not be sent' + err);
            }
        });
    }

    /**
     * handle incoming message
     * @private
     */
    _handleMessage(message) {
        let message_type;

        try {
            message = JSON.parse(message);
            message_type = Object.keys(message)[0];
        } catch (error) {
            debug('Error parsing incoming message %s', error);
            this.emit('error', error);
            return;
        }

        debug('received message of type "%s" from homee', message_type);

        switch (message_type) {
            case 'all':
                this._nodes = message.all.nodes;
                this._groups = message.all.groups;
                this._relationships = message.all.relationships;
                break;
            case 'nodes':
                this._nodes = message.nodes;
                break;
            case 'node':
                this._updateNodes(message.node);
                break;
            case 'groups':
                this._groups = message.groups
                break;
            case 'relationships':
                this._relationships = message.relationships
                break;
            case 'attribute':
                this._handleAttributeChange(message.attribute)
                break;
            case 'attribute_history':
            case 'homeegram_history':
            case 'node_history':
                this.emit('history', message_type.replace('_history', ''), message[message_type]);
        }

        // broadcast on specific channel
        const ignore = ['attribute', 'attribute_history', 'homeegram_history', 'node_history'];
        if (ignore.indexOf(message_type) === - 1) this.emit(message_type, message[message_type])

        // broadcast message
        this.emit('message', message);
    }

    /**
     * attaches the the node to an given attribute, updates the attribute at the global node list and emits an event
     * @param attribute {object}
     * @private
     */
    _handleAttributeChange(attribute) {
        debug('attribute changed, attribute id %d', attribute.id)

        if (this._nodes.length) {
            const nodeIndex = this._nodes.findIndex(node => node.id === attribute.node_id)
            const attributeIndex = this._nodes[nodeIndex].attributes.findIndex(a => a.id === attribute.id)

            this._nodes[nodeIndex].attributes[attributeIndex] = attribute
            attribute.node = this._nodes[nodeIndex]
        }

        this.emit('attribute', attribute);
    }

    /**
     * update attribute values
     * PUT:/nodes/1/attributes/1?target_value=50.5
     * @param device_id {number}
     * @param attribute_id {number}
     * @param value {number}
     */
    setValue(device_id, attribute_id, value) {
        debug('trying to set %d as target_value for attribute #%d (device #%d)', value, attribute_id, device_id);

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
     * start heartbeat handler to monitor ws connection
     * @returns {number}
     * @private
     */
    _startHearbeatHandler() {
        debug('starting HearbeatHandler')

        this._ws.on('pong', () => {
            debug('received pong')
            this._connected = true;
        });

        return setInterval(() => {
            debug('send ping')
            if (this._ws && this._connected === false) {
                debug('did not receive pong, terminating connection...')
                this._ws.terminate();
                this._ws = null;
                debug('lost ping, try reconnect in %ds', this._reconnectInterval / 1000)
                return;
            }
            this._connected = false;
            this._ws.ping((err) => {
                if (err) debug('error sending ping command to homee: %s', err.toString()) });
        }, 30000);
    }


    /**
     * get groups
     * @returns {Array}
     */
    get groups() {
        return this._groups
    }

    /**
     * get nodes
     * @returns {Array}
     */
    get nodes() {
        return this._nodes;
    }

    /**
     * get attributes
     * @returns {*}
     */
    get attributes() {
        if (!this._nodes.length) return [];

        return this._nodes.map(n => n.attributes).reduce((a, b) => a.concat(b), []);
    }

    /**
     * returns the nodes of a given group
     * @param group String|Number
     * @returns {Array}
     */
    getNodesByGroup(group) {
        if (!this._relationships) throw new Error('No relationships available')

        if (typeof(group) === 'string') {
            group = this._groups.find(g => g.name === encodeURIComponent(group)).id
        }

        const nodeIds = this._relationships.filter(r => r.group_id === group).map(r => r.node_id)
        return this._nodes.filter(n => nodeIds.indexOf(n.id) > -1)
    }


    _updateNodes(node) {
        const nodeIndex = this._nodes.findIndex(n => n.id === node.id)
        this._nodes[nodeIndex] = node;
    }

    /**
     * create a new group
     *
     * @param String name
     * @param String image
     */
    createGroup(name, image = 'default') {
        this.send(`POST:groups?name=${name}&image=${image}`)
    }


    /**
     * delete a group
     * @param id Number
     */
    deleteGroup(id) {
        this.send(`DELETE:groups/${id}`);
    }


    /**
     * plays a homeegram
     *
    * @param id {number} Homeegram ID
     */
    play(id) {
        debug('play homeegram #%d', id);
        this.send(`PUT:homeegrams/${id}?play=1`);
    }

    /**
     * activates a homeegram
     * @param id
     */
    activateHomeegram(id) {
        debug('activate homeegram #%d', id);
        this.send(`PUT:homeegrams/${id}?active=1`)
    }

    /**
     * deactivates a homeegram
     * @param id
     */
    deactivateHomeegram(id) {
        debug('deactivate homeegram #%d', id);
        this.send(`PUT:homeegrams/${id}?active=0`)
    }

    /**
     * stop heartbeathandler
     * @private
     */
    _stopHeartbeathandler() {
        if (!this._heartbeatHandler) return;

        clearInterval(this._heartbeatHandler);
        this._heartbeatHandler = null;
        debug('stopped HeartbeatHandler');
    }

    /**
     * close connection
     */
    disconnect() {
        this._shouldClose = true;

        this._ws.close(1000, 'closed by user request');
        debug('connection closed');
        this.emit('disconnected', 'closed by user request')
    }

    /**
     * retrieve history for node, attribute or homeegram
     * @param type  "node", "attribute" or "homeegram"
     * @param id  node id, attribute id, or homeegram id
     * @param from  Timestamp
     * @param till  Timestamp
     * @param limit  Number
     */
    getHistory(type, id, from = null, till = null, limit = null) {
        debug('request history for %s #%d', type, id);

        let params = '';
        if (from) params += `from=${Math.floor(from/1000)}&`;
        if (till) params += `till=${Math.floor(till/1000)}&`;
        if (limit) params += `limit=${limit}&`;

        switch (type) {
            case 'node':
            case 'homeegram':
                this.send(`GET:${type}s/${id}/history?${params}`);
                break;
            case 'attribute':
                const attribute = [].concat.apply([], this._nodes.map(n => n.attributes)).find(a => a.id === id);
                this.send(`GET:nodes/${id}/attributes/${attribute.id}/history?${params}`);
                break;
            default:
                this.emit('error', 'history is only available for type "node", "attribute" and "homeegram"');
                return;
        }
    }

    /**
     * returns the base url
     * @returns {string}
     * @private
     */
    _url() {
        if (/^[0-z]{12}$/.test(this._host)) return `https://${this._host}.hom.ee`;
        return `http://${this._host}:7681`;
    }

    /**
     * returns the ws-url
     * @returns {string}
     * @private
     */
    _wsUrl() {
        if (/^[0-z]{12}$/.test(this._host)) return `wss://${this._host}.hom.ee`;
        return `ws://${this._host}:7681`;
    }
}

module.exports = Homee;