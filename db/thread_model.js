const db = require('./index');
const crypto = require('crypto');

const addThread = (board, text, delete_password) => {
  const timestamp = new Date().getTime();
  const id        = crypto.randomBytes(128).toString('hex');
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO thread values (?, ?, ?, ?, ?, false, ?);`,
      [id, board, text, timestamp, timestamp, delete_password], (err, row) => {
      if (err) {
        reject(`Failed adding thread: ${err}`);
        return;
      }
      resolve();
    });
  });
};

module.exports = {
  addThread,
};