const axios = require('axios').default;

const FieldMapper = require('./field-mapper');
const SOURCES = require('./field-source');
const TYPE = require('./field-type');

class DefaultService {
  cacheExpirationSeconds = 30;
  fields = [];

  stationFeaturesDict = {};

  constructor(stations) {
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

    this.initStationsDict(stations);
  }

  initStationsDict(stations) {
    for (const feature of stations.features) {
      this.stationFeaturesDict[parseInt(feature.properties.code)] = feature;
    }
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

  async getData(request, callback) {
    if (request.params.id !== 'default') {
      return callback({code: 400, message: 'Unsupported ID'});
    }
    try {
      const response = await axios.post('https://ttsview.railway.co.th/checktrain.php', new URLSearchParams({grant: 'user', train: 0, station: 0}).toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      this.formatData(response.data.data, callback);
    } catch (error) {
      if (error.code && error.message) {
        return callback(error);
      }
      return callback({code: 500, message: error.toString()});
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
      const stationFeature = this.stationFeaturesDict[parseInt(train.station_code)];
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

  static createKey(request) {
    return `SRTTTS_${request.params.id}`;
  }
}

module.exports = DefaultService;
