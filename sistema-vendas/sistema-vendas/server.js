require('dotenv').config();
const app = require('./src/app');
const conexao = require('./src/db');

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, async () => {
  console.log(`API rodando em http://localhost:${PORT}`);
  try {
    await conexao.query('SELECT 1');
    console.log('Conexão com o MySQL OK.');
  } catch (erro) {
    console.error('Falha ao conectar no MySQL:', erro.message);
  }
});
