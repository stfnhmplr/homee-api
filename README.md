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
    
    // available events
    homee.on('message', (message) => {});
    homee.on('change', (attribute) => {})
    homee.on('disconnect', (code) => {});
    homee.on('error', (err) => {});
    homee.on('reconnect', (retries) => {})
    
    // special events
    homee.on('user', (user) => {})
    homee.on('attribtue', (attribute) => {})
    homee.on('node', (node) => {})
    // ...tbc
    
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
### Methods
```js
// send any message
homee.send('your-message, i.E. GET:nodes');

// update an attributes target_value
homee.setValue(device_id, attribute_id, value);
```
