class ProviderTestModel {
  getData(_, callback) {
    console.log('Request');

    const geojson = {
      type: 'FeatureCollection',
      metadata: {
        name: 'Test feature layer',
        expires: Date.now() + 5000
      },
      ttl: 5,
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Point',
            coordinates: [0, 0]
          }
        }
      ]
    };

    console.log('Callback');
    console.log('');
    callback(null, geojson);
  }

  createKey(_) {
    console.log('CreateKey');
    return 1;
  }
}

module.exports = {
  type: 'provider',
  name: 'test',
  version: '0.0.0',
  Model: ProviderTestModel,
  hosts: false,
  disableIdParam: true
};
