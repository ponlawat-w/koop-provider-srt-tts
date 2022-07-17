class Graph {
  network = {};

  constructor(linesGeojson, stations) {
    for (const feature of linesGeojson.features) {
      this.processFeature(feature, stations);
    }
  }

  getDistance(stations, code1, code2) {
    const station1 = stations.features.filter(f => f.properties.code === code1)[0];
    const station2 = stations.features.filter(f => f.properties.code === code2)[0];
    return Math.abs(station1.properties.exact_km - station2.properties.exact_km);
  }

  processFeature(feature, stations) {
    const code1 = feature.properties.code1;
    const code2 = feature.properties.code2;
    this.addEdge(code1, code2, this.getDistance(stations, code1, code2));
    this.addEdge(code2, code1, this.getDistance(stations, code1, code2));
  }

  addEdge(code1, code2, distance) {
    if (!this.network[code1]) {
      this.network[code1] = {};
    }
    this.network[code1][code2] = distance;
  }

  getAdjacencies(code) {
    return this.network[code] ? Object.keys(this.network[code]).map(x => parseInt(x)) : [];
  }

  travel(code1, code2) {
    const results = [];
    this.travelVertex(code1, code2, results);
    if (!results.length) {
      return null;
    }

    return results.reduce(this.reduceToBestResult.bind(this));
  }

  reduceToBestResult(bestSoFar, current) {
    if (!bestSoFar) {
      return current;
    }
    return this.getResultDistance(bestSoFar) > this.getResultDistance(current) ? current : bestSoFar;
  }

  getResultDistance(path) {
    let distance = 0;
    for (let i = 1; i < path.length; i++) {
      distance += this.network[path[i - 1]][path[i]];
    }
    return distance;
  }

  travelVertex(current, destination, results, path = [current]) {
    const adjacencies = this.getAdjacencies(current).filter(x => path.indexOf(x) < 0);
    for (const adjacency of adjacencies) {
      if (adjacency === destination) {
        return [...path, adjacency];
      }
      const result = this.travelVertex(adjacency, destination, results, [...path, adjacency]);
      if (result) {
        results.push(result);
      }
    }
    return null;
  }
}

module.exports = Graph;
