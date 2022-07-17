const model = require('./model');

module.exports = {
  type: 'provider',
  name: 'srt',
  version: '0.0.0',
  Model: model,
  hosts: false,
  disabledIdParam: false
};
