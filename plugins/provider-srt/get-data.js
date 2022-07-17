const path = require('path');
const fs = require('fs');
const axios = require('axios').default;

const urls = require('./layer-url');

const { srt } = require('config');
const useTemp = srt ? srt.useTemp : false;

const fnCreator = (layerName) => async() => {
  if (useTemp) {
    const filePath = path.join(__dirname, '..', '..', 'data', `${layerName}.geojson`);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath));
    }
  }

  const url = `${urls[layerName]}/query?` + (new URLSearchParams({f: 'geojson', where: '1=1', outFields: '*'}).toString());
  const response = await axios.get(url);
  return response && response.data ? response.data : null;
};

module.exports = {
  stations: fnCreator('stations'),
  lines: fnCreator('lines')
};
