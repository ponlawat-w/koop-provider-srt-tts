const Koop = require('koop');
const cors = require('cors');

process.env.TZ = 'Asia/Bangkok';

const koop = new Koop();

if (process.env.KOOP_CORS) {
  koop.server.use(cors({
    origin: process.env.KOOP_CORS,
    credentials: true
  }));
}

koop.register(require('./plugins/provider-test'));
koop.register(require('./plugins/provider-srt-tts'));

const port = process.env.KOOP_PORT ? process.env.KOOP_PORT : 8080;

koop.server.listen(port, () => {
  console.log(`Koop server is started at port ${port}`);
});
