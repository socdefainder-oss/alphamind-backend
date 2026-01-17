const { Pool } = require('pg');
const { parse } = require('pg-connection-string');
require('dotenv').config();

// Parse da connection string
const config = parse(process.env.DATABASE_URL);

// Configuração do pool de conexões PostgreSQL com IPv4 forçado
const pool = new Pool({
  host: config.host,
  port: config.port,
  user: config.user,
  password: config.password,
  database: config.database,
  ssl: {
    rejectUnauthorized: false // Necessário para Supabase
  },
  family: 4, // FORÇAR IPv4 (0 = ambos, 4 = IPv4, 6 = IPv6)
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Evento de erro
pool.on('error', (err) => {
  console.error('Erro inesperado no pool do PostgreSQL', err);
  process.exit(-1);
});

// Função para testar conexão
async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log(' Conectado ao PostgreSQL (Supabase):', result.rows[0].now);
    client.release();
    return true;
  } catch (error) {
    console.error(' Erro ao conectar no PostgreSQL:', error.message);
    console.error(' Stack:', error.stack);
    return false;
  }
}

// Função auxiliar para queries
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Query executada:', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Erro na query:', error.message);
    throw error;
  }
}

module.exports = {
  pool,
  query,
  testConnection
};
