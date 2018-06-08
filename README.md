# homee API wrapper

> work in progress

a library to interact with [homee](https://hom.ee)

## Installation
```
npm install homee-api --save
```

## Usage

### connect and receive messages
```js
const Homee = require('homee-api');

const homee = new Homee(host, user, password, [device-name]);

homee.connect().then(() => {
    
    homee.on('message', (message) => {
        // handle messages (JSON)
    });
    
    homee.on('disconnect', (code) => {
        // handle disconnects
    });
    
    homee.on('error', (err) => {
       // handle errors
    });
    
}).catch((err) => {
    console.log(err);
});
```

### methods
```js
homee.send('your-message, i.E. GET:nodes');
```

set an attribute to a specific value
```js
homee.setValue(device_id, attribute_id, value);
```
