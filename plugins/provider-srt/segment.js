class LineSegment {
  linesGeojson = {};

  constructor(linesGeojson) {
    this.linesGeojson = linesGeojson;
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
        code2: code2
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
    let coordinates = [];
    for (let i = 0; i < geometries.length; i++) {
      const geometry = geometries[i];

      let geometryCoordinates = geometry.coordinates;
      if (i > 0) {
        geometryCoordinates.splice(1);
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
