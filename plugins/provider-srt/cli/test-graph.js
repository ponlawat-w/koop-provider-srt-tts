const process = require('process');
const fs = require('fs');
const path = require('path');

const getData = require('../get-data');
const Graph = require('../graph');
const LineSegment = require('../segment');

const code1 = parseInt(process.argv[2]);
const code2 = parseInt(process.argv[3]);

const main = async() => {
  const lines = await getData.lines();
  const stations = await getData.stations();
  const graph = new Graph(lines, stations);
  const lineSegment = new LineSegment(lines);

  const resultPath = graph.travel(code1, code2);
  if (resultPath) {
    console.log(resultPath.join(' => '));

    const geometry = lineSegment.getPathGeometry(resultPath);

    fs.writeFileSync(path.join(__dirname, '..', '..', '..', 'data', 'segment.geojson'), JSON.stringify({
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: {from: code1, to: code2},
        geometry: geometry
      }]
    }));
  } else {
    console.error('No result');
  }
};

main();
