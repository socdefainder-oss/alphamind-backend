const { Pool } = require('pg');
const { parse } = require('pg-connection-string');
const dns = require('dns');
const { promisify } = require('util');
require('dotenv').config();

const resolve4 = promisify(dns.resolve4);

// Função lookup customizada que FORÇA IPv4
async function customLookup(hostname, options, callback) {
  try {
    console.log(' Resolvendo DNS para:', hostname);
    const addresses = await resolve4(hostname);
    if (addresses && addresses.length > 0) {
      const ipv4 = addresses[0];
      console.log(' IPv4 resolvido:', ipv4);
      callback(null, ipv4, 4);
    } else {
      throw new Error('Nenhum endereço IPv4 encontrado');
    }
  } catch (error) {
    console.error(' Erro ao resolver DNS:', error.message);
    // Fallback para lookup padrão
    dns.lookup(hostname, { family: 4 }, callback);
  }
}

// Parse da connection string
const dbUrl = process.env.DATABASE_URL;
console.log(' DATABASE_URL:', dbUrl ? 'Definido' : 'UNDEFINED');

if (!dbUrl) {
  console.error(' DATABASE_URL não está definido!');
  process.exit(1);
}

const config = parse(dbUrl);

// Log da configuração (sem senha)
console.log(' Config:', {
  host: config.host,
  port: config.port,
  user: config.user,
  database: config.database
});

// Configuração do pool com lookup customizado
const pool = new Pool({
  host: config.host,
  port: config.port || 5432,
  user: config.user,
  password: config.password,
  database: config.database,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  // FORÇAR IPv4 com lookup customizado
  lookup: customLookup,
});

// Evento de erro
pool.on('error', (err) => {
  console.error(' Erro inesperado no pool do PostgreSQL', err);
  process.exit(-1);
});

// Função para testar conexão
async function testConnection() {
  try {
    console.log(' Tentando conectar ao PostgreSQL...');
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log(' Conectado ao PostgreSQL (Supabase):', result.rows[0].now);
    client.release();
    return true;
  } catch (error) {
    console.error(' Erro ao conectar no PostgreSQL:', error.message);
    console.error(' Código:', error.code);
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
    console.log('Query executada:', { text: text.substring(0, 50), duration, rows: res.rowCount });
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
