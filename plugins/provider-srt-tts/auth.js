const fs = require('fs');

module.exports = (username) => {
  const users = JSON.parse(fs.readFileSync(process.env.KOOP_AUTH_PATH));
  return users.filter(x => x.username === username)[0] ?? null;
};
