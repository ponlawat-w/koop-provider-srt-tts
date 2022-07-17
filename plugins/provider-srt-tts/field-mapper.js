const SOURCES = require('./field-source');
const TYPES = require('./field-type');

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
    return { name: this.name, type: this.type, alias: this.alias, length: this.length };
  }
}

module.exports = FieldMapper;
