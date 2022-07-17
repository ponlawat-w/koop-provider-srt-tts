const getStaticData = require('../provider-srt/get-data');
const DefaultService = require('./service-default');

class Model {
  stations = null;
  lines = null;

  initialised = false;
  defaultService = null;

  async init() {
    this.initialised = true;
    this.stations = await getStaticData.stations();
    this.lines = await getStaticData.lines();
    this.defaultService = new DefaultService(this.stations);
  }

  async getData(request, callback) {
    await this.init();
    try {
      switch (request.params.id) {
        case 'default':
          return this.defaultService.getData(request, callback);
      }
    } catch (error) {
      if (error.code && error.message) {
        return callback(error);
      }
      return callback({code: 500, message: error.toString()});
    }
    callback({code: 400, message: 'Unrecognised layer ID'});
  }

  createKey(request) {
    switch (request.params.id) {
      case 'default':
        return DefaultService.createKey(request);
    }
    return 'SRTTTS';
  }
}

module.exports = Model;
