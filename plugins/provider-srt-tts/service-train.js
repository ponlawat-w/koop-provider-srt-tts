const Graph = require('../provider-srt/graph');
const Segment = require('../provider-srt/segment');
const FieldMapper = require('./field-mapper');
const DefaultService = require('./service-default');
const Train = require('./train');

const SOURCES = require('./field-source');
const TYPE = require('./field-type');
const { default: axios } = require('axios');

class TrainService {
  static caches = {};
  static ttl = 60;

  stations = {};
  lines = {};

  graph = null;
  segment = null;

  totalLineFields = [];
  pointFields = [];
  segmentFields = [];

  constructor(stations, lines) {
    this.stations = stations;
    this.lines = lines;

    this.graph = new Graph(this.lines, this.stations);
    this.segment = new Segment(this.lines);

    this.totalLineFields.push(new FieldMapper(SOURCES.MANUAL, 'train_id', 'train_id', TYPE.INTEGER));
    this.totalLineFields.push(new FieldMapper(SOURCES.TTS_DEFAULT, 'trains_no', 'train_number', TYPE.INTEGER));
    this.totalLineFields.push(new FieldMapper(SOURCES.TTS_DEFAULT, 'rundate', 'date', TYPE.STRING));
    this.totalLineFields.push(new FieldMapper(SOURCES.TTS_DEFAULT, 'train_type', 'type_th', TYPE.STRING));
    this.totalLineFields.push(new FieldMapper(SOURCES.TTS_DEFAULT, 'train_type_eng', 'type_en', TYPE.STRING));
    this.totalLineFields.push(new FieldMapper(SOURCES.TTS_DEFAULT, 'traintypeid', 'type_id', TYPE.STRING));
    this.totalLineFields.push(new FieldMapper(SOURCES.TTS_DEFAULT, 'line', 'line', TYPE.INTEGER));
    this.totalLineFields.push(new FieldMapper(SOURCES.TTS_DEFAULT, 'from', 'origin_station_th', TYPE.STRING));
    this.totalLineFields.push(new FieldMapper(SOURCES.TTS_DEFAULT, 'fromen', 'origin_station_en', TYPE.STRING));
    this.totalLineFields.push(new FieldMapper(SOURCES.TTS_DEFAULT, 'fromch', 'origin_station_zh', TYPE.STRING));
    this.totalLineFields.push(new FieldMapper(SOURCES.TTS_DEFAULT, 'to', 'destination_station_th', TYPE.STRING));
    this.totalLineFields.push(new FieldMapper(SOURCES.TTS_DEFAULT, 'toen', 'destination_station_en', TYPE.STRING));
    this.totalLineFields.push(new FieldMapper(SOURCES.TTS_DEFAULT, 'toch', 'destination_station_zh', TYPE.STRING));

    this.pointFields.push(new FieldMapper(SOURCES.STATIONS, 'code', 'station_code', TYPE.INTEGER));
    this.pointFields.push(new FieldMapper(SOURCES.MANUAL, 'train_id', 'train_id', TYPE.INTEGER));
    this.pointFields.push(new FieldMapper(SOURCES.MANUAL, 'sequence', 'sequence', TYPE.INTEGER));
    this.pointFields.push(new FieldMapper(SOURCES.TTS_DEFAULT, 'trains_no', 'train_number', TYPE.INTEGER));
    this.pointFields.push(new FieldMapper(SOURCES.TTS_DEFAULT, 'rundate', 'date', TYPE.STRING));
    this.pointFields.push(new FieldMapper(SOURCES.MANUAL, 'scheduled_arrival', 'scheduled_arrival', TYPE.DATE));
    this.pointFields.push(new FieldMapper(SOURCES.MANUAL, 'scheduled_departure', 'scheduled_departure', TYPE.DATE));
    this.pointFields.push(new FieldMapper(SOURCES.MANUAL, 'actual_arrival', 'actual_arrival', TYPE.DATE));
    this.pointFields.push(new FieldMapper(SOURCES.MANUAL, 'actual_departure', 'actual_departure', TYPE.DATE));
    this.pointFields.push(new FieldMapper(SOURCES.MANUAL, 'scheduled_arrival_str', 'scheduled_arrival_str', TYPE.STRING));
    this.pointFields.push(new FieldMapper(SOURCES.MANUAL, 'scheduled_departure_str', 'scheduled_departure_str', TYPE.STRING));
    this.pointFields.push(new FieldMapper(SOURCES.MANUAL, 'actual_arrival_str', 'actual_arrival_str', TYPE.STRING));
    this.pointFields.push(new FieldMapper(SOURCES.MANUAL, 'actual_departure_str', 'actual_departure_str', TYPE.STRING));
    this.pointFields.push(new FieldMapper(SOURCES.TTS_TRAIN, 'arrlate', 'arrival_delay_minutes', TYPE.INTEGER, undefined, undefined, x => parseInt(x) ?? null));
    this.pointFields.push(new FieldMapper(SOURCES.TTS_TRAIN, 'deplate', 'departure_delay_minutes', TYPE.INTEGER, undefined, undefined, x => parseInt(x) ?? null));
    this.pointFields.push(new FieldMapper(SOURCES.TTS_TRAIN, 'current', 'current', TYPE.INTEGER));
    this.pointFields.push(new FieldMapper(SOURCES.TTS_TRAIN, 'passyet', 'passed', TYPE.INTEGER, undefined, undefined, x => parseInt(x)));
    this.pointFields.push(new FieldMapper(SOURCES.STATIONS, 'code', 'code', TYPE.STRING, undefined, undefined, x => x.toString()));
    this.pointFields.push(new FieldMapper(SOURCES.STATIONS, 'name', 'name', TYPE.STRING));
    this.pointFields.push(new FieldMapper(SOURCES.STATIONS, 'name_en', 'name_en', TYPE.STRING));
    this.pointFields.push(new FieldMapper(SOURCES.STATIONS, 'name_zh', 'name_zh', TYPE.STRING));

    this.segmentFields.push(new FieldMapper(SOURCES.MANUAL, 'segment_id', 'segment_id', TYPE.INTEGER));
    this.segmentFields.push(new FieldMapper(SOURCES.MANUAL, 'train_id', 'train_id', TYPE.INTEGER));
    this.segmentFields.push(new FieldMapper(SOURCES.MANUAL, 'train_number', 'train_number', TYPE.INTEGER));
    this.segmentFields.push(new FieldMapper(SOURCES.MANUAL, 'date', 'date', TYPE.STRING));
    this.segmentFields.push(new FieldMapper(SOURCES.MANUAL, 'from_code', 'from_code', TYPE.STRING));
    this.segmentFields.push(new FieldMapper(SOURCES.MANUAL, 'to_code', 'to_code', TYPE.STRING));
    this.segmentFields.push(new FieldMapper(SOURCES.MANUAL, 'passed', 'passed', TYPE.INTEGER));
    this.segmentFields.push(new FieldMapper(SOURCES.MANUAL, 'current', 'current', TYPE.INTEGER));
    this.segmentFields.push(new FieldMapper(SOURCES.MANUAL, 'departure_delay_minutes', 'departure_delay_minutes', TYPE.INTEGER));
    this.segmentFields.push(new FieldMapper(SOURCES.MANUAL, 'arrival_delay_minutes', 'arrival_delay_minutes', TYPE.INTEGER));
    this.segmentFields.push(new FieldMapper(SOURCES.MANUAL, 'delay_made', 'delay_made', TYPE.INTEGER));
  }

  async getData(request, callback) {
    const trainId = TrainService.getId(request);
    const layer = parseInt(request.params.layer);
    if (!trainId) {
      if (isNaN(layer)) {
        return callback(null, this.toFeatureServerResults(
          this.getTotalLineGeojsonTemplate(),
          this.getPointsGeojsonTemplate(),
          this.getSegmentsGeojsonTemplate()
        ));
      }
      switch (layer) {
        case 0:
          return callback(null, this.getTotalLineGeojsonTemplate());
        case 1:
          return callback(null, this.getPointsGeojsonTemplate());
        case 2:
          return callback(null, this.getSegmentsGeojsonTemplate());
        default:
          return callback({code: 404, message: `Layer ${layer} not found`});
      }
    }

    if (isNaN(layer)) {
      return callback(null, this.toFeatureServerResults(
        await this.getTotalLineGeojson(request, trainId),
        await this.getPointsGeojson(request, trainId),
        await this.getSegmentsGeojson(request, trainId)
      ));
    }

    switch (layer) {
      case 0:
        return callback(null, this.getTotalLineGeojson(request, trainId));
      case 1:
        return callback(null, this.getPointsGeojson(request, trainId));
      case 2:
        return callback(null, this.getSegmentsGeojson(request, trainId));
    }
    return callback({code: 404, message: `Layer ${layer} not found`});
  }

  static async getTrainData(trainId) {
    const cacheItem = TrainService.caches[trainId];
    if (cacheItem && new Date().getTime() - cacheItem.fetched.getTime() < (TrainService.ttl * 1000)) {
      return cacheItem.value;
    }

    const { trainNumber, runDate } = Train.expandId(trainId);

    const response = await axios.post('https://ttsview.railway.co.th/checktrain.php', new URLSearchParams({
      grant: 'user',
      train: trainNumber,
      date: runDate
    }).toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    if (response.status === 200 && response.data) {
      if (TrainService.caches[trainId]) {
        TrainService.caches[trainId].fetched = new Date();
        TrainService.caches[trainId].value = response.data;
      } else {
        TrainService.caches[trainId] = {
          fetched: new Date(),
          value: response.data
        };
      }
    }

    return TrainService.caches[trainId].value;
  }

  toFeatureServerResults(totalLineGeojson, pointsGeojson, segmentsGeojson) {
    return {
      layers: [totalLineGeojson, pointsGeojson, segmentsGeojson]
    };
  }

  async getTrainFromDefaultData(trainId) {
    const { trainNumber, runDate } = Train.expandId(trainId);
    const defaultData = await DefaultService.getLastData();
    const trains = defaultData.filter(x => parseInt(x.trains_no) === parseInt(trainNumber) && x.rundate === runDate);
    if (!trains.length) {
      const err = `Train ${trainNumber} on ${runDate} not found in default service`;
      console.error(err);
      throw {code: 500, message: err};
    }
    return trains[0];
  }

  getStationFromCode(code) {
    const stations = this.stations.features.filter(f => parseInt(f.properties.code) === parseInt(code));
    if (!stations.length) {
      const err = `Station ${code} not found`;
      console.error(err);
      throw {code: 500, message: err};
    }
    return stations[0];
  }

  getTotalLineGeojsonTemplate(trainId = undefined) {
    const { trainNumber } = Train.expandId(trainId);

    return {
      type: 'FeatureCollection',
      metadata: {
        id: 0,
        name: `เส้นทางขบวน${trainNumber ? ' ' + trainNumber : ''}`,
        description: `เส้นทางเดินรถขบวน${trainNumber ? ' ' + trainNumber : ''} ทั้งเส้นทาง`,
        geometryType: 'LineString',
        idField: 'train_id',
        expires: Date.now() + (TrainService.ttl * 1000),
        fields: this.totalLineFields.map(field => field.getMetadata())
      },
      ttl: TrainService.ttl,
      features: []
    };
  }

  getPointsGeojsonTemplate(trainId = undefined) {
    const { trainNumber } = Train.expandId(trainId);

    return {
      type: 'FeatureCollection',
      metadata: {
        id: 1,
        name: `จุดจอดขบวน${trainNumber ? ' ' + trainNumber : ''}`,
        description: `จุดจอดระหว่างทางของขบวน${trainNumber ? ' ' + trainNumber : ''}`,
        geometryType: 'Point',
        idField: 'station_code',
        expires: Date.now() + (TrainService.ttl * 1000),
        fields: this.pointFields.map(field => field.getMetadata())
      },
      ttl: TrainService.ttl,
      features: []
    };
  }

  getSegmentsGeojsonTemplate(trainId = undefined) {
    const { trainNumber } = Train.expandId(trainId);

    return {
      type: 'FeatureCollection',
      metadata: {
        id: 2,
        name: `เส้นทางระหว่างสถานีของขบวน${trainNumber ? ' ' + trainNumber : ''}`,
        description: `เส้นทางระหว่างสถานีของขบวน${trainNumber ? ' ' + trainNumber : ''}`,
        geometryType: 'LineString',
        idField: 'segment_id',
        expires: Date.now() + (TrainService.ttl * 1000),
        fields: this.segmentFields.map(field => field.getMetadata())
      },
      ttl: TrainService.ttl,
      features: []
    };
  }

  async getTotalLineGeojson(_, trainId) {
    const geojson = this.getTotalLineGeojsonTemplate(trainId);

    const data = await TrainService.getTrainData(trainId);
    
    const segments = data.right.map((x, i) => i === 0 ? null : [data.right[i - 1].stcode, x.stcode]).filter(x => x);
    const paths = segments.map(function(od) { return this.graph.travel(od[0], od[1]); }.bind(this));
    const geometry = this.segment.combineGeometries(paths.map(function(path) { return this.segment.getPathGeometry(path); }.bind(this)));

    const feature = {
      type: 'Feature',
      properties: {},
      geometry: geometry
    };

    const sources = {
      [SOURCES.MANUAL]: { train_id: trainId },
      [SOURCES.TTS_DEFAULT]: await this.getTrainFromDefaultData(trainId)
    };

    for (const field of this.totalLineFields) {
      field.mapValue(sources, feature.properties);
    }

    geojson.features.push(feature);

    return geojson;
  }

  async getPointsGeojson(_, trainId) {
    const geojson = this.getPointsGeojsonTemplate(trainId);

    const defaultData = await this.getTrainFromDefaultData(trainId);
    const trainData = await TrainService.getTrainData(trainId);
    
    let feature = undefined;
    let i = 0;
    for (const stopPoint of trainData.right) {
      feature = this.stopPointToFeature(trainId, ++i, trainData.left.starton, stopPoint, defaultData, feature);
      geojson.features.push(feature);
    }

    geojson.features[geojson.features.length - 1].properties.actual_departure = null;
    geojson.features[geojson.features.length - 1].properties.actual_departure_str = null;

    return geojson;
  }

  stopPointToFeature(trainId, i, startOn, stopPointData, defaultData, previousFeature) {
    const station = this.getStationFromCode(stopPointData.stcode);

    const previousScheduledDeparture = previousFeature ? previousFeature.properties.scheduled_departure : null;
    const previousActualDeparture = previousFeature ? previousFeature.properties.actual_departure : null;

    let scheduledArrival = TrainService.toDate(startOn, stopPointData.arrive);
    let scheduledDeparture = TrainService.toDate(startOn, stopPointData.depart);
    let actualArrival = TrainService.toDate(startOn, stopPointData.actarr);
    let actualDeparture = TrainService.toDate(startOn, stopPointData.actdep);

    let scheduledArrivalOffset = '';
    let scheduledDepartureOffset = '';
    let actualArrivalOffset = '';
    let actualDepartureOffset = '';

    if (previousScheduledDeparture && scheduledArrival && previousScheduledDeparture.getTime() > scheduledArrival) {
      scheduledArrival = new Date(scheduledArrival.getTime() + 86400000);
      scheduledArrivalOffset = ' (+1)';
    }
    if (previousScheduledDeparture && scheduledDeparture && previousScheduledDeparture.getTime() > scheduledDeparture) {
      scheduledDeparture = new Date(scheduledDeparture.getTime() + 86400000);
      scheduledDepartureOffset = ' (+1)';
    }
    if (previousActualDeparture && actualArrival && previousActualDeparture.getTime() > actualArrival) {
      actualArrival = new Date(actualArrival.getTime() + 86400000);
      actualArrivalOffset = ' (+1)';
    }
    if (previousActualDeparture && actualDeparture && previousActualDeparture.getTime() > actualDeparture) {
      actualDeparture = new Date(actualDeparture.getTime() + 86400000);
      actualDepartureOffset = ' (+1)';
    }

    const sources = {
      [SOURCES.STATIONS]: station.properties,
      [SOURCES.TTS_DEFAULT]: defaultData,
      [SOURCES.TTS_TRAIN]: stopPointData,
      [SOURCES.MANUAL]: {
        train_id: trainId,
        sequence: i,
        scheduled_arrival: scheduledArrival,
        scheduled_departure: scheduledDeparture,
        actual_arrival: actualArrival,
        actual_departure: actualDeparture,
        scheduled_arrival_str: scheduledArrival ? scheduledArrival.toLocaleTimeString() + scheduledArrivalOffset : null,
        scheduled_departure_str: scheduledDeparture ? scheduledDeparture.toLocaleTimeString() + scheduledDepartureOffset : null,
        actual_arrival_str: actualArrival ? actualArrival.toLocaleTimeString() + actualArrivalOffset : null,
        actual_departure_str: actualDeparture ? actualDeparture.toLocaleTimeString() + actualDepartureOffset : null
      }
    };

    const feature = {
      type: 'Feature',
      properties: {},
      geometry: station.geometry
    };

    for (const field of this.pointFields) {
      field.mapValue(sources, feature.properties);
    }

    return feature;
  }

  async getSegmentsGeojson(_, trainId) {
    const geojson = this.getSegmentsGeojsonTemplate(trainId);

    const { trainNumber, runDate } = Train.expandId(trainId);

    const trainData = await TrainService.getTrainData(trainId);
    for (let i = 1; i < trainData.right.length; i++) {
      const previousStopPoint = trainData.right[i - 1];
      const stopPoint = trainData.right[i];
      const fromCode = parseInt(previousStopPoint.stcode);
      const toCode = parseInt(stopPoint.stcode);
      const passed = parseInt(stopPoint.passyet);
      const current = parseInt(previousStopPoint.current);
      const departureDelay = parseInt(previousStopPoint.deplate) ?? null;
      const arrivalDelay = parseInt(stopPoint.arrlate) ?? null;
      const delayMade = arrivalDelay - departureDelay;

      const sources = {
        [SOURCES.MANUAL]: {
          train_id: trainId,
          segment_id: i,
          train_number: trainNumber,
          date: runDate,
          from_code: fromCode.toString(),
          to_code: toCode.toString(),
          passed: passed,
          current: current,
          departure_delay_minutes: departureDelay,
          arrival_delay_minutes: arrivalDelay,
          delay_made: delayMade
        }
      };

      const geometry = this.segment.getPathGeometry(this.graph.travel(fromCode, toCode));

      const feature = {
        type: 'Feature',
        properties: {},
        geometry: geometry
      };

      for (const field of this.segmentFields) {
        field.mapValue(sources, feature.properties);
      }

      geojson.features.push(feature);
    }

    return geojson;
  }

  static toDate(dateStr, timeStr) {
    if (!/\d\d:\d\d/g.test(timeStr)) {
      return null;
    }

    const startOnComponents = dateStr.split('-').map(x => parseInt(x));
    const timeComponents = timeStr.split(':').map(x => parseInt(x));

    return new Date(startOnComponents[2], startOnComponents[1] - 1, startOnComponents[0], timeComponents[0], timeComponents[1], 0);
  }

  static getId(request) {
    const paramsIdComponents = request.params.id.split('::');
    if (paramsIdComponents.length > 1) {
      return parseInt(paramsIdComponents[1]);
    }

    let where = request.query.where ?? '';
    if (Array.isArray(where)) {
      where = where.join(' AND ');
    }

    const matchesIn = /train_id\s+(IN|in|In|iN)\s*\(([\d\s,]+)\)/g.exec(request.query.where ?? '');
    if (matchesIn) {
      const ids = matchesIn[2].toString().split(',');
      if (ids.length === 1) {
        request.query.where = `train_id = ${ids[0]}`;
      }
    }
    const matchesEqual = /train_id\s*=\s*(\d+)/g.exec(request.query.where ?? '');
    if (matchesEqual) {
      return parseInt(matchesEqual[1].toString());
    }
    return undefined;
  }

  static createKey(request) {
    const trainId = TrainService.getId(request);
    const layer = request.params.layer ?? 'ALL';
    return `SRTTTS_TRAIN_${trainId}_${layer}`;
  }
}

module.exports = TrainService;
