const getStaticData = require('../provider-srt/get-data');
const DefaultService = require('./service-default');
const TrainService = require('./service-train');

class Model {
  stations = null;
  lines = null;

  initialised = false;
  defaultService = null;
  trainService = null;

  async init() {
    this.initialised = true;
    this.stations = await getStaticData.stations();
    this.lines = await getStaticData.lines();
    this.defaultService = new DefaultService(this.stations);
    this.trainService = new TrainService(this.stations, this.lines);
  }

  async getData(request, callback) {
    const idComponents = request.params.id.split('::');
    await this.init();
    try {
      switch (idComponents[0]) {
        case 'default':
          return this.defaultService.getData(request, callback);
        case 'train':
          return this.trainService.getData(request, callback);
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
    const idComponents = request.params.id.split('::');
    switch (idComponents[0]) {
      case 'default':
        return DefaultService.createKey(request);
      case 'train':
        return TrainService.createKey(request);
    }
    return 'SRTTTS';
  }
}

module.exports = Model;
