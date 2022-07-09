const Model = require('./model');

module.exports = {
  type: 'provider',
  name: 'srt-tts',
  version: '0.0.0',
  Model: Model,
  hosts: false,
  disableIdParam: true
};
