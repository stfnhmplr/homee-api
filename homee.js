/**
 * created by stfnhmplr (info@himpler.com)
 * a homee-api-wrapper
 * @LICENSE MIT
 */

const WebSocket = require('ws');
const axios = require('axios');
const qs = require('qs');
const shajs = require('sha.js');
const EventEmitter = require('events');
const debug = require('debug')('homee');
const Enums = require('./lib/enums');
const { updateList } = require('./lib/helpers');

class Homee extends EventEmitter {
  /**
   *
   * @param host {string}
   * @param user {string}
   * @param password {string}
   * @param cOptions {Object}
   */
  constructor(host, user, password, cOptions = {}) {
    super();

    const options = {
      device: 'homeeApi',
      reconnect: true,
      reconnectInterval: 5000,
      maxRetries: Infinity,
    };

    // merge options
    Object.keys(cOptions).forEach((attr) => {
      if ({}.hasOwnProperty.call(cOptions, attr)) {
        options[attr] = cOptions[attr];
      }
    });

    this.host = host;
    this.user = user;
    this.password = password;
    this.device = options.device;
    this.deviceId = options.device
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/\s+/g, '-')
      .toLowerCase();
    this.reconnectInterval = options.reconnectInterval;
    this.shouldReconnect = options.reconnect;
    this.maxRetries = options.maxRetries;
    this.nodes = [];
    this.groups = [];
    this.relationships = [];
    this.homeegrams = [];
    this.plans = [];
    this.ws = null;
    this.token = '';
    this.expires = 0;
    this.connected = false;
    this.retries = 0;
    this.shouldClose = false;
    this.enums = Enums;
  }

  /**
   * query access token
   * @returns {Promise<any>}
   * @private
   */
  getAccessToken() {
    debug('get access token');

    const authBuffer = Buffer.from(
      `${this.user}:${shajs('sha512').update(this.password).digest('hex')}`,
    );

    const options = {
      method: 'post',
      timeout: 2500,
      url: `${this.url()}/access_token`,
      headers: {
        Authorization: `Basic ${authBuffer.toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: qs.stringify({
        device_name: this.device,
        device_hardware_id: this.deviceId,
        device_os: this.enums.CADeviceOS.CADeviceOSLinux,
        device_type: this.enums.CADeviceType.CADeviceTypeNone,
        device_app: this.enums.CADeviceApp.CADeviceAppHomee,
      }),
    };

    return new Promise((resolve, reject) => {
      if (this.token && this.expires > Date.now()) {
        debug('token still valid');
        return resolve(this.token);
      }

      if (this.retries) {
        debug('reconnect attempt #%d', this.retries);
        this.emit('reconnect', this.retries);
      }

      this.retries += 1;
      if (this.retries > this.maxRetries) {
        this.emit('maxRetries', this.maxRetries);
        return reject(new Error(`reached max retries (${this.maxRetries})`));
      }

      return axios(options).then((res) => {
        const re = /^access_token=([0-z]+)&.*&expires=(\d+)$/;
        const matches = res.data.match(re);
        if (!matches) return reject(new Error('invalid response'));

        let expires;
        [, this.token, expires] = matches;
        this.expires = Date.now() + expires * 1000;

        debug(`received access token, valid until: ${new Date(this.expires).toISOString()}`);
        this.retries = 0;
        return resolve(this.token);
      }).catch((err) => {
        debug(`cannot receive access token, ${err}`);
        if (err.response) {
          return reject(
            new Error(`Request failed with status ${err.response.status} ${err.response.statusText}`),
          );
        }
        return setTimeout(() => resolve(this.getAccessToken()),
          this.reconnectInterval * this.retries);
      });
    });
  }

  /**
   * connect to homee
   * @returns {Promise<any>}
   */
  connect() {
    this.shouldClose = false;

    return new Promise((resolve, reject) => {
      this.getAccessToken()
        .then(() => {
          this.openWs(resolve, reject);
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
  openWs(resolve, reject) {
    if (this.retries) {
      debug('reconnect attempt #%d', this.retries);
      this.emit('reconnect', this.retries);
    }

    this.retries += 1;
    if (this.retries > this.maxRetries) {
      debug('reached max retries %d', this.maxRetries);
      this.emit('maxRetries', this.maxRetries);
      return;
    }

    try {
      debug('trying to connect');
      this.ws = new WebSocket(
        `${this.wsUrl()}/connection?access_token=${this.token}`,
        'v2', // Sec-WebSocket-Protocol
        {
          protocolVersion: 13,
          origin: this.url(),
          handshakeTimeout: 5000,
        },
      );
    } catch (err) {
      debug('cannot open ws connection err: %s', err);
      if (typeof reject === 'function') reject(new Error(`cannot connect to homee${err}`));
      setTimeout(() => this.openWs(), this.reconnectInterval * this.retries);
    }

    this.ws.on('open', () => {
      if (typeof resolve === 'function') resolve();
      this.connected = true;
      this.retries = 1;

      this.emit('connected');
      debug('connected to homee');

      this.heartbeatHandler = this.startHearbeatHandler();
      this.send('GET:all');
    });

    this.ws.on('message', (message) => {
      try {
        const parsedMessage = JSON.parse(message);
        this.handleMessage(parsedMessage);
      } catch (err) {
        debug(`can't parse json message ${message}`);
        this.emit('error', 'Received unexpected message from websocket');
      }
    });

    this.ws.on('close', (reason) => {
      if (!this.shouldClose && this.retries <= 1) debug('lost connection to homee');
      this.stopHeartbeathandler();

      this.connected = false;
      this.ws = null;

      this.emit('disconnected', reason);
      if (this.shouldReconnect && !this.shouldClose) {
        setTimeout(
          () => this.openWs(), this.reconnectInterval * this.retries,
        );
      }
    });

    this.ws.on('error', (err) => {
      debug('Websocket %s', err);
      this.emit('error', err.toString());
    });
  }

  /**
   * sends a raw message via websocket
   * @param {string}  message  the message, i.e. 'GET:nodes'
   */
  send(message) {
    if (!this.connected || !this.ws) return;
    debug('sending message "%s" to homee', message);

    this.ws.send(message, (err) => {
      if (err) {
        debug('error sending message: %s', err);
        this.emit('error', `message could not be sent${err}`);
      }
    });
  }

  /**
   * handle incoming message
   * @private
   *
   */
  handleMessage(message) {
    let messageType;

    try {
      [messageType] = Object.keys(message);
    } catch (error) {
      debug('Error parsing incoming message %s', error);
      this.emit('error', error);
      return;
    }

    debug(`received message of type "${messageType}" from homee`);

    switch (messageType) {
      case 'all':
        debug(message);
        this.nodes = message.all.nodes;
        this.groups = message.all.groups;
        this.relationships = message.all.relationships;
        this.plans = message.all.plans;
        this.homeegrams = message.all.homeegrams;
        break;
      case 'attribute':
        this.handleAttributeChange(message.attribute);
        break;
      case 'group':
        updateList(this.groups, message.group);
        break;
      case 'groups':
        this.groups = message.groups;
        break;
      case 'node':
        updateList(this.nodes, message.node);
        break;
      case 'nodes':
        this.nodes = message.nodes;
        break;
      case 'relationship':
        updateList(this.relationships, message.relationship);
        break;
      case 'relationships':
        this.relationships = message.relationships;
        break;
      case 'homeegram':
        updateList(this.homeegrams, message.homeegram);
        break;
      case 'homeegrams':
        this.homeegrams = message.homeegrams;
        break;
      case 'plan':
        updateList(this.plans, message.plan);
        break;
      case 'plans':
        this.plans = message.plans;
        break;
      case 'attribute_history':
      case 'homeegram_history':
      case 'node_history':
        this.emit('history', messageType.replace('_history', ''), message[messageType]);
        break;
      default:
        debug(`No special handling for message of type "${messageType}"`);
    }

    // broadcast on specific channel
    const ignore = ['attribute', 'attribute_history', 'homeegram_history', 'node_history'];
    if (ignore.indexOf(messageType) === -1) this.emit(messageType, message[messageType]);

    // broadcast message
    this.emit('message', message);
  }

  /**
   * attaches the the node to an given attribute,
   * updates the attribute at the global node list and emits an event
   * @param attribute {Object}
   * @private
   */
  handleAttributeChange(attribute) {
    debug(`attribute with id #${attribute.id} changed`);

    try {
      const nodeIndex = this.nodes.findIndex((node) => node.id === attribute.node_id);
      const attributeIndex = this.nodes[nodeIndex].attributes.findIndex(
        (a) => a.id === attribute.id,
      );
      this.nodes[nodeIndex].attributes[attributeIndex] = attribute;
      this.emit('attribute', { ...attribute, node: this.nodes[nodeIndex] });
    } catch (e) {
      debug('Cannot find node, emitting attribute only');
      this.emit('attribute', attribute);
    }
  }

  /**
   * update attribute values
   * PUT:/nodes/1/attributes/1?target_value=50.5
   * @param device_id {number}
   * @param attribute_id {number}
   * @param value {number}
   */
  setValue(deviceId, attributeId, value) {
    debug(
      `trying to set ${value} as target_value for attribute #${attributeId} (device #${deviceId})`,
    );

    if (typeof deviceId !== 'number') {
      this.emit('error', 'device_id must be a number');
      return;
    }

    if (typeof attributeId !== 'number') {
      this.emit('error', 'attribute_id must be a number');
      return;
    }

    if (typeof value !== 'number') {
      this.emit('error', 'value must be a number');
      return;
    }

    this.send(`PUT:/nodes/${deviceId}/attributes/${attributeId}?target_value=${value}`);
  }

  /**
   * start heartbeat handler to monitor ws connection
   * @returns {number}
   * @private
   */
  startHearbeatHandler() {
    debug('starting HearbeatHandler');

    this.ws.on('pong', () => {
      debug('received pong');
      this.connected = true;
    });

    return setInterval(() => {
      debug('send ping');
      if (this.ws && this.connected === false) {
        debug('did not receive pong, terminating connection...');
        this.ws.terminate();
        this.ws = null;
        debug('lost ping, try reconnect in %ds', this.reconnectInterval / 1000);
        return;
      }
      this.connected = false;
      if (this.ws) {
        this.ws.ping((err) => {
          if (err) debug('error sending ping command to homee: %s', err.toString());
        });
      }
    }, 30000);
  }

  /**
   * get attributes
   * @returns {Array}
   */
  get attributes() {
    if (!this.nodes.length) return [];

    return this.nodes.map((n) => n.attributes).reduce((a, b) => a.concat(b), []);
  }

  /**
   * returns the nodes of a given group
   * @param group {string|number}
   * @returns {Array}
   */
  getNodesByGroup(group) {
    if (!this.relationships) throw new Error('No relationships available');

    let groupId;

    if (typeof group === 'string') {
      groupId = this.groups.find((g) => g.name === encodeURIComponent(group)).id;
    } else {
      groupId = group;
    }

    const nodeIds = this.relationships.filter((r) => r.group_id === groupId).map((r) => r.node_id);
    return this.nodes.filter((n) => nodeIds.indexOf(n.id) > -1);
  }

  /**
   * create a new group
   *
   * @param {string} name
   * @param {string} image
   */
  createGroup(name, image = 'default') {
    this.send(`POST:groups?name=${name}&image=${image}`);
  }

  /**
   * delete a group
   * @param id {number}
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
     * @param id {number}
     */
  activateHomeegram(id) {
    debug('activate homeegram #%d', id);
    this.send(`PUT:homeegrams/${id}?active=1`);
  }

  /**
     * deactivates a homeegram
     * @param id {number}
     */
  deactivateHomeegram(id) {
    debug('deactivate homeegram #%d', id);
    this.send(`PUT:homeegrams/${id}?active=0`);
  }

  /**
   * stop heartbeathandler
   * @private
   */
  stopHeartbeathandler() {
    if (!this.heartbeatHandler) return;

    clearInterval(this.heartbeatHandler);
    this.heartbeatHandler = null;
    debug('stopped HeartbeatHandler');
  }

  /**
   * close connection
   */
  disconnect() {
    this.shouldClose = true;

    if (this.ws) {
      this.ws.close(1000, 'closed by user request');
    }
    debug('connection closed');
    this.emit('disconnected', 'closed by user request');
  }

  /**
   * retrieve history for node, attribute or homeegram
   * @param type  "node", "attribute" or "homeegram"
   * @param id  node id, attribute id, or homeegram id
   * @param from  {timestamp}
   * @param till  {timestamp}
   * @param limit  {number}
   */
  getHistory(type, id, from = null, till = null, limit = null) {
    debug('request history for %s #%d', type, id);

    let params = '';
    if (from) params += `from=${Math.floor(from / 1000)}&`;
    if (till) params += `till=${Math.floor(till / 1000)}&`;
    if (limit) params += `limit=${limit}&`;

    switch (type) {
      case 'node':
      case 'homeegram':
        this.send(`GET:${type}s/${id}/history?${params}`);
        break;
      case 'attribute': {
        const attribute = [].concat(...this.nodes.map((n) => n.attributes))
          .find((a) => a.id === id);
        this.send(`GET:nodes/${id}/attributes/${attribute.id}/history?${params}`);
        break;
      }
      default:
        this.emit(
          'error',
          'history is only available for type "node", "attribute" and "homeegram"',
        );
    }
  }

  /**
   * retrieve diary entries
   * hint: you should use one or more parameters to shrink the result set
   * @param from  {timestamp}
   * @param till  {timestamp}
   * @param limit  {number}
   */
  getDiary(from = null, till = null, limit = null) {
    debug('request diary entries');

    let params = '';
    if (from) params += `from=${Math.floor(from / 1000)}&`;
    if (till) params += `till=${Math.floor(till / 1000)}&`;
    if (limit) params += `limit=${limit}&`;

    this.send(`GET:diary?${params}`);
  }

  /**
   * returns the base url
   * @returns {string}
   * @private
   */
  url() {
    if (/^[0-z]{12}$/.test(this.host)) return `https://${this.host}.hom.ee`;
    return `http://${this.host}:7681`;
  }

  /**
   * returns the ws-url
   * @returns {string}
   * @private
   */
  wsUrl() {
    if (/^[0-z]{12}$/.test(this.host)) return `wss://${this.host}.hom.ee`;
    return `ws://${this.host}:7681`;
  }

  getLog() {
    return new Promise((resolve, reject) => {
      const options = {
        timeout: 5000,
        url: `${this.url()}/logfile.log`,
        params: {
          access_token: this.token,
        },
      };

      axios(options)
        .then((res) => resolve(res.data))
        .catch((err) => reject(err));
    });
  }
}

module.exports = Homee;
