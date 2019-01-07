# homee API wrapper

> work in progress

a library to interact with [homee](https://hom.ee)

## Installation
```
npm install homee-api --save
```

## Usage

### Connect
```js
const Homee = require('homee-api');

const homee = new Homee(host, user, password, options);

homee.connect().then(() => {
    //
}).catch((error) => {
    console.log(error);
});
```

#### Options
```js
    {
        device: 'homeeApi',
        reconnect:  true,
        reconnectInterval: 5000,
        maxRetries: Infinity
    }
```

### Events
```js
    
    // handle at least the "error" event to prevent crashing
    homee.on('error', (err) => {});
    
    homee.on('message', (message) => {});
    homee.on('connected', () => {});
    homee.on('reconnect', (retries) => {})
    homee.on('disconnected', (reason) => {});
    homee.on('maxRetries', (maxRetries) => {});
    
    // special events
    homee.on('user', (user) => {})
    homee.on('attribtue', (attribute) => {})
    homee.on('nodes', (nodes) => {})
    homee.on('history', (type, data) => {})
    // ...tbc
```
### Methods
```js
// send any message
homee.send('your-message, i.E. GET:nodes');

// homeegram interactions
homee.play(id)
homee.activateHomeegram(id);
homee.deactivateHomeegram(id);

// update an attributes target_value
homee.setValue(device_id, attribute_id, value);

// group interactions
homee.createGroup(name, image);
homee.deleteGroup(id);
homee.getNodesByGroup(id); // id or group name

// get diary entries (you should use at least one parameter to shrink the result set)
homee.getDiary(from, till, limit);

// get History for node or attribute (type), from and till are unix timestamps 
homee.getHistory(type, id, from, till, limit);

// close connection
homee.disconnect();
```

### Stored Nodes
The homee api keeps a copy of all your nodes, attributes and groups. Each time the value of an attribute changes, the stored data is also updated. The following attributes give you access to the data at any time.

```js
const nodes = homee.nodes
const attributes = homee.attributes
const groups = homee.groups
```
