const Koop = require('koop');

const koop = new Koop();
koop.register(require('./plugins/provider-test'));
koop.register(require('./plugins/provider-srt-tts'));

const port = process.env.KOOP_PORT ? process.env.KOOP_PORT : 8080;

koop.server.listen(port, () => {
  console.log(`Koop server is started at port ${port}`);
});
