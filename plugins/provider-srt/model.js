const getData = require('./get-data');
const Graph = require('./graph');
const Segment = require('./segment');

class SrtModel {
  initialised = false;
  lines = null;
  stations = null;
  graph = null;
  segment = null;

  async init() {
    this.lines = await getData.lines();
    this.stations = await getData.stations();
    this.graph = new Graph(this.lines, this.stations);
    this.segment = new Segment(this.lines);

    this.initialised = true;
  }

  async getSegment(idSegments, callback) {
    const ttl = 3600;

    const from = parseInt(idSegments[1]);
    const to = parseInt(idSegments[2]);
    const path = this.graph.travel(from, to);
    if (!path) {
      return callback({code: 500, message: `Unable to travel from ${from} to ${to}`});
    }

    const geometry = this.segment.getPathGeometry(path);
    return callback(null, {
      type: 'FeatureCollection',
      metadata: {
        name: `เส้นทางรถไฟจากสถานีรหัส ${from} ไปยัง ${to}`,
        geometryType: 'Line',
        expires: Date.now() + (ttl * 1000),
        fields: [
          {name: 'from', type: 'Integer'},
          {name: 'to', type: 'Integer'}
        ]
      },
      ttl: ttl,
      features: [{
        type: 'Feature',
        properties: {
          from: from,
          to: to
        },
        geometry: geometry
      }]
    });
  }

  async getData(request, callback) {
    if (!this.initialised) {
      await this.init();
    }

    const idSegments = request.params.id.split('::');
    if (idSegments[0] === 'segment') {
      return this.getSegment(idSegments, callback);
    }
    return callback({code: 400, message: 'Invalid ID parameter'});
  }

  async createKey(request) {
    return `SRT_${request.params.id}`;
  }
}

module.exports = SrtModel;
