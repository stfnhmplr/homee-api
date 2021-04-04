const HomeeMockup = require('./HomeeMockup');

before(() => {
  process.env.NODE_ENV = 'test';
  global.homeeMockup = new HomeeMockup('e663e30818201d28dd07803e57333bed4f15803a');
});

after(async () => {
  await global.homeeMockup.close();
  process.exit(); // TODO: shutdown gracefully
});
