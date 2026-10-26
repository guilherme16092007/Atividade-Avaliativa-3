require('dotenv').config();
const mysql = require('mysql2/promise');

// Credenciais SEMPRE vindas de variáveis de ambiente (.env)
const conexao = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'db_vendas',
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true, // DECIMAL retorna como number (e não string)
  dateStrings: true     // DATETIME retorna como string 'YYYY-MM-DD HH:MM:SS'
});

module.exports = conexao;
