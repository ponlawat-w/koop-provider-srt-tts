const path = require('path');
const fs = require('fs');
const axios = require('axios').default;

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

  constructor(source, sourceKey, name, type = TYPE.STRING, alias = undefined, length = undefined) {
    this.name = name;
    this.type = type;
    this.alias = alias;
    this.length = length;
    this.source = source;
    this.sourceKey = sourceKey;
  }

  mapValue(stations, ttsResponse, outputPropertiesObject) {
    let source = undefined;
    if (this.source === SOURCES.STATIONS) {
      source = stations;
    } else if (this.source === SOURCES.TTS) {
      source = ttsResponse;
    }
    outputPropertiesObject[this.name] = source && source[this.sourceKey] ? source[this.sourceKey] : null;
  }

  getMetadata() {
    return {name: this.name, type: this.type, alias: this.alias, length: this.length};
  }
}

class Model {

  stationsFeatures = {}
  cacheExpirationMinutes = 2
  fields = [];

  constructor() {
    const stopsGeojson = JSON.parse(fs.readFileSync(path.join(__dirname, 'stations.geojson')));
    for (const feature of stopsGeojson.features) {
      this.stationsFeatures[parseInt(feature.properties.code)] = feature;
    }

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
    this.fields.push(new FieldMapper(SOURCES.STATIONS, 'code', 'current_station_code', TYPE.INTEGER));
    this.fields.push(new FieldMapper(SOURCES.STATIONS, 'name', 'current_station_th', TYPE.STRING));
    this.fields.push(new FieldMapper(SOURCES.STATIONS, 'name_en', 'current_station_en', TYPE.STRING));
    this.fields.push(new FieldMapper(SOURCES.STATIONS, 'name_zh', 'current_station_zh', TYPE.STRING));
    this.fields.push(new FieldMapper(SOURCES.TTS, 'stop_no', 'current_sequence', TYPE.STRING));
    this.fields.push(new FieldMapper(SOURCES.TTS, 'fullarrtime', 'arrived_time', TYPE.DATE));
    this.fields.push(new FieldMapper(SOURCES.TTS, 'fulldeptime', 'departed_time', TYPE.DATE));
    this.fields.push(new FieldMapper(SOURCES.TTS, 'deplate', 'delay_minutes', TYPE.INTEGER));
  }

  getPrototypeGeojson() {
    return {
      type: 'FeatureCollection',
      metadata: {
        name: 'ระบบรายงานติดตามขบวนรถ รฟท.',
        description: 'ข้อมูลแปลงเชิงภูมิศาสตร์ของระบบรายงานติดตามขบวนรถ รฟท. โดยมีตำแหน่งขบวนรถอยู่ที่สถานี',
        geometryType: 'Point',
        idField: 'train_number',
        expires: Date.now() + (this.cacheExpirationMinutes * 1000),
        fields: this.fields.map(field => field.getMetadata())
      },
      ttl: this.cacheExpirationMinutes,
      features: []
    };
  }

  getData(_, callback) {
    axios.post('https://ttsview.railway.co.th/checktrain.php', new URLSearchParams({grant: 'user', train: 0, station: 0}).toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }).then(response => {
      this.formatData(response.data.data, callback);
    });
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
