const axios = require('axios').default;
const fs = require('fs');
const path = require('path');
const layerUrls = require('../layer-url');

const main = async() => {
  const directory = path.join(__dirname, '..', '..', '..', 'data');
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory);
  }

  for (const key of Object.keys(layerUrls)) {
    console.log(key);
    const url = `${layerUrls[key]}/query?` + (new URLSearchParams({f: 'geojson', where: '1=1', outFields: '*'}).toString());
    const response = await axios.get(url);
    if (response && response.data) {
      fs.writeFileSync(path.join(directory, `${key}.geojson`), JSON.stringify(response.data));
    }
  }

  console.log('OK');
};

main();
