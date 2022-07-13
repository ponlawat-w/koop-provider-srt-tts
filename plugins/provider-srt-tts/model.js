const axios = require('axios').default;
const authService = require('./auth');

const SOURCES = {
  STATIONS: 1,
  TTS: 2
};

const TYPE = {
  DATE: 'Date',
  DOUBLE: 'Double',
  INTEGER: 'Integer',
  STRING: 'String'
};

class FieldMapper {
  name = undefined;
  type = undefined;
  alias = undefined;
  length = undefined;

  source = undefined;
  sourceKey = undefined;

  mapper = undefined;

  constructor(source, sourceKey, name, type = TYPE.STRING, alias = undefined, length = undefined, mapper = undefined) {
    this.name = name;
    this.type = type;
    this.alias = alias;
    this.length = length;
    this.source = source;
    this.sourceKey = sourceKey;
    this.mapper = mapper;
  }

  mapValue(stations, ttsResponse, outputPropertiesObject) {
    let source = undefined;
    if (this.source === SOURCES.STATIONS) {
      source = stations;
    } else if (this.source === SOURCES.TTS) {
      source = ttsResponse;
    }
    const value = source && source[this.sourceKey] !== undefined ? source[this.sourceKey] : null;
    outputPropertiesObject[this.name] = this.mapper ? this.mapper(value) : value;
  }

  getMetadata() {
    return {name: this.name, type: this.type, alias: this.alias, length: this.length};
  }
}

class Model {

  stationsFeatures = {}
  cacheExpirationSeconds = 30
  fields = [];

  constructor() {
    this.fields.push(new FieldMapper(SOURCES.TTS, 'trains_no', 'train_number', TYPE.INTEGER));
    this.fields.push(new FieldMapper(SOURCES.TTS, 'train_type', 'type_th', TYPE.STRING));
    this.fields.push(new FieldMapper(SOURCES.TTS, 'train_type_eng', 'type_en', TYPE.STRING));
    this.fields.push(new FieldMapper(SOURCES.TTS, 'traintypeid', 'type_id', TYPE.STRING));
    this.fields.push(new FieldMapper(SOURCES.TTS, 'line', 'line', TYPE.INTEGER));
    this.fields.push(new FieldMapper(SOURCES.TTS, 'from', 'origin_station_th', TYPE.STRING));
    this.fields.push(new FieldMapper(SOURCES.TTS, 'fromen', 'origin_station_en', TYPE.STRING));
    this.fields.push(new FieldMapper(SOURCES.TTS, 'fromch', 'origin_station_zh', TYPE.STRING));
    this.fields.push(new FieldMapper(SOURCES.TTS, 'to', 'destination_station_th', TYPE.STRING));
    this.fields.push(new FieldMapper(SOURCES.TTS, 'toen', 'destination_station_en', TYPE.STRING));
    this.fields.push(new FieldMapper(SOURCES.TTS, 'toch', 'destination_station_zh', TYPE.STRING));
    this.fields.push(new FieldMapper(SOURCES.STATIONS, 'code', 'current_station_code', TYPE.STRING, undefined, undefined, x => x.toString()));
    this.fields.push(new FieldMapper(SOURCES.STATIONS, 'name', 'current_station_th', TYPE.STRING));
    this.fields.push(new FieldMapper(SOURCES.STATIONS, 'name_en', 'current_station_en', TYPE.STRING));
    this.fields.push(new FieldMapper(SOURCES.STATIONS, 'name_zh', 'current_station_zh', TYPE.STRING));
    this.fields.push(new FieldMapper(SOURCES.TTS, 'stopno', 'current_sequence', TYPE.STRING));
    this.fields.push(new FieldMapper(SOURCES.TTS, 'fullarrtime', 'arrived_time', TYPE.DATE));
    this.fields.push(new FieldMapper(SOURCES.TTS, 'fullarrtime', 'arrived_time_str', TYPE.STRING, undefined, undefined, x => new Date(x + '+07:00').toISOString()));
    this.fields.push(new FieldMapper(SOURCES.TTS, 'fulldeptime', 'departed_time', TYPE.DATE));
    this.fields.push(new FieldMapper(SOURCES.TTS, 'fulldeptime', 'departed_time_str', TYPE.STRING, undefined, undefined, x => new Date(x + '+07:00').toISOString()));
    this.fields.push(new FieldMapper(SOURCES.TTS, 'deplate', 'delay_minutes', TYPE.INTEGER));
    this.fields.push(new FieldMapper(SOURCES.TTS, 'arrtime', 'stopped', TYPE.INTEGER, undefined, undefined, x => x !== 'ผ่าน' ? 1 : 0));
    this.fields.push(new FieldMapper(SOURCES.TTS, 'deptime', 'ended', TYPE.INTEGER, undefined, undefined, x => x === 'ปลายทาง' ? 1 : 0));
  }

  getPrototypeGeojson() {
    return {
      type: 'FeatureCollection',
      metadata: {
        name: 'ระบบรายงานติดตามขบวนรถ รฟท.',
        description: 'ข้อมูลแปลงเชิงภูมิศาสตร์ของระบบรายงานติดตามขบวนรถ รฟท. โดยมีตำแหน่งขบวนรถอยู่ที่สถานี',
        geometryType: 'Point',
        idField: 'train_number',
        expires: Date.now() + (this.cacheExpirationSeconds * 1000),
        fields: this.fields.map(field => field.getMetadata())
      },
      ttl: this.cacheExpirationSeconds,
      features: []
    };
  }

  async fetchStations() {
    if (Object.keys(this.stationsFeatures).length) {
      return;
    }
    const url = process.env.STATIONS_LAYER ? process.env.STATIONS_LAYER :
      'https://services5.arcgis.com/XDMGTTbkgKWI2WMY/ArcGIS/rest/services/%E0%B8%AA%E0%B8%96%E0%B8%B2%E0%B8%99%E0%B8%B5%E0%B9%81%E0%B8%A5%E0%B8%B0%E0%B9%80%E0%B8%AA%E0%B9%89%E0%B8%99%E0%B8%97%E0%B8%B2%E0%B8%87%E0%B9%80%E0%B8%94%E0%B8%B4%E0%B8%99%E0%B8%A3%E0%B8%96_%E0%B8%A3%E0%B8%9F%E0%B8%97/FeatureServer/6/query?f=geojson&where=1=1&outfields=*';
    const response = await axios.get(url);
    const geojson = response.data;
    for (const feature of geojson.features) {
      this.stationsFeatures[parseInt(feature.properties.code)] = feature;
    }
  }

  async checkAuth(request) {
    const credentials = await this.authorize(request);
    const user = authService(credentials.sub);
    if (!user || !user.services || user.services.indexOf('srt-tts') < 0) {
      return false;
    }
    return true;
  }

  async getData(request, callback) {
    if (process.env.KOOP_AUTH && !(await this.checkAuth(request))) {
      return callback('Unauthorised user');
    }
    if (request.params.id !== 'default') {
      return callback('Unsupported id');
    }
    try {
      await this.fetchStations();
      const response = await axios.post('https://ttsview.railway.co.th/checktrain.php', new URLSearchParams({grant: 'user', train: 0, station: 0}).toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      this.formatData(response.data.data, callback);
    } catch (error) {
      callback(error);
    };
  }

  formatData(data, callback) {
    const geojson = this.getPrototypeGeojson();
    for (const train of data) {
      const feature = {
        type: 'Feature',
        properties: {},
        geometry: null
      };
      const stationFeature = this.stationsFeatures[parseInt(train.station_code)];
      if (stationFeature) {
        feature.geometry = stationFeature.geometry;
      } else {
        console.warn(`Station code ${train.station_code} not found. Skipped.`);
        continue;
      }

      for (const field of this.fields) {
        field.mapValue(stationFeature ? stationFeature.properties : null, train, feature.properties);
      }

      geojson.features.push(feature);
    }

    callback(null, geojson);
  }

  createKey() {
    return 'SRT';
  }
}

module.exports = Model;
