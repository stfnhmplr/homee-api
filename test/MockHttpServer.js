const http = require('http');
const token = 'e663e30818201d28dd07803e57333bed4f15803a';

module.exports = http
    .createServer((request, response) => {
        if (request.url === '/access_token') {
            response.end(
                'access_token=e663e30818201d28dd07803e57333bed4f15803a&user_id=23&device_id=1&expires=360'
            );
        }
    })
    .listen(7681);
