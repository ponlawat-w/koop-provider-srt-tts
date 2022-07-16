const Model = require('./model');

module.exports = {
  type: 'provider',
  name: 'srt-tts',
  version: '0.1.0',
  Model: Model,
  hosts: false,
  disableIdParam: false
};
