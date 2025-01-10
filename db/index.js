const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database(
  process.env.NODE_ENV === 'test' ? ":memory:" : DB_FILE,
  (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the SQLite database.');
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS board (
    name text primary key
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS thread (
    _id text,
    board text,
    text text not null,
    created_on integer not null,
    bumped_on integer not null,
    reported boolean not null,
    delete_password text not null,
    PRIMARY KEY (_id, board),
    FOREIGN KEY (board) REFERENCES board(name)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS reply (
    _id text primary key,
    thread text not null,
    board text not null,
    text text not null,
    created_on integer not null,
    reported boolean not null,
    delete_password text not null,
    FOREIGN KEY (thread, board) REFERENCES thread(_id, board)
  )`);

  db.run(`INSERT INTO board VALUES("general") ON CONFLICT(name) DO NOTHING`)
});

module.exports = db;