const http = require('http');
const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'mysql',
  user: 'appuser',
  password: 'apppass',
  database: 'appdb'
});

http.createServer((req, res) => {
  db.query('SELECT NOW() as now', (err, result) => {
    if (err) return res.end('DB error');
    res.end('Backend OK | MySQL: ' + result[0].now);
  });
}).listen(3000);