const Koop = require('koop');
const cors = require('cors');

process.env.TZ = 'Asia/Bangkok';

const koop = new Koop();

if (process.env.KOOP_CORS) {
  const allowedCorigins = process.env.KOOP_CORS.split(',');
  koop.server.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedCorigins.indexOf(origin) > -1) {
        return callback(null, true);
      } else {
        callback('ERROR CORS');
      }
    },
    credentials: true
  }));
}

koop.register(require('./plugins/provider-test'));
koop.register(require('./plugins/provider-srt'));
koop.register(require('./plugins/provider-srt-tts'));

const port = process.env.KOOP_PORT ? process.env.KOOP_PORT : 8080;

koop.server.listen(port, () => {
  console.log(`Koop server is started at port ${port}`);
});
