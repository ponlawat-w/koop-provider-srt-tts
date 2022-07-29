const turfDistance = require('@turf/distance').default;

class LineSegment {
  linesGeojson = {};
  stationsGeojson = {};

  constructor(linesGeojson, stationsGeojson) {
    this.linesGeojson = linesGeojson;
    this.stationsGeojson = stationsGeojson;
  }

  getFeature(code1, code2) {
    const results = this.linesGeojson.features.filter(f => f.properties.code1 === code1 && f.properties.code2 === code2);
    return results.length ? results[0] : null;
  }

  getAndReverseFeature(code1, code2) {
    const feature = this.getFeature(code1, code2);
    return {
      ...feature,
      properties: {
        ...feature.properties,
        code1: code2,
        code2: code1
      },
      geometry: {
        ...feature.geometry,
        coordinates: feature.geometry.coordinates.map(x => x).reverse()
    }
    };
  }

  getGeometry(code1, code2) {
    const directFeature = this.getFeature(code1, code2);
    if (directFeature) {
      return directFeature.geometry;
    }
    const reversedFeature = this.getAndReverseFeature(code2, code1);
    return reversedFeature ? reversedFeature.geometry : null;
  }

  combineGeometries(geometries) {
    const turfOptions = { units: 'kilometers' };
    let coordinates = [];
    for (let i = 0; i < geometries.length; i++) {
      const geometry = geometries[i];
      
      let geometryCoordinates = [...geometry.coordinates];
      if (i > 0) {
        const currentFirstCoordinate = geometryCoordinates[0];
        const currentLastCoordinate = geometryCoordinates[geometryCoordinates.length - 1];
        const previousLastCoordinate = coordinates[coordinates.length - 1];

        if (turfDistance(previousLastCoordinate, currentLastCoordinate, turfOptions) < turfDistance(previousLastCoordinate, currentFirstCoordinate, turfOptions)) {
          geometryCoordinates.reverse();
        }

        geometryCoordinates.splice(0, 1);
      }
      coordinates = [...coordinates, ...geometryCoordinates];
    }

    return {
      type: 'LineString',
      coordinates: coordinates
    };
  }

  getPathGeometry(path) {
    const geometries = [];
    for (let i = 1; i < path.length; i++) {
      geometries.push(this.getGeometry(path[i - 1], path[i]));
    }
    if (geometries.filter(x => !x).length) {
      throw 'Not all edges in path can generate partial segment';
    }

    return this.combineGeometries(geometries);
  }
}

module.exports = LineSegment;
