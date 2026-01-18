const { Pool } = require('pg');
const { parse } = require('pg-connection-string');
const dns = require('dns');
const { promisify } = require('util');
require('dotenv').config();

const resolve4 = promisify(dns.resolve4);

// Parse da connection string
const dbUrl = process.env.DATABASE_URL;
console.log(' DATABASE_URL:', dbUrl ? 'Definido' : 'UNDEFINED');

if (!dbUrl) {
  console.error(' DATABASE_URL não está definido!');
  process.exit(1);
}

const config = parse(dbUrl);

// Log da configuração (sem senha)
console.log(' Config original:', {
  host: config.host,
  port: config.port,
  user: config.user,
  database: config.database
});

// Função para resolver DNS para IPv4 ANTES de criar o Pool
async function resolveToIPv4(hostname) {
  try {
    console.log(' Resolvendo DNS para IPv4:', hostname);
    const addresses = await resolve4(hostname);
    if (addresses && addresses.length > 0) {
      const ipv4 = addresses[0];
      console.log(' IPv4 resolvido:', ipv4);
      return ipv4;
    }
    throw new Error('Nenhum endereço IPv4 encontrado');
  } catch (error) {
    console.error(' Erro ao resolver para IPv4:', error.message);
    console.log(' Usando hostname original:', hostname);
    return hostname;
  }
}

// Criar pool com IP resolvido
async function createPool() {
  // Resolver hostname para IPv4
  const host = await resolveToIPv4(config.host);
  
  console.log(' Config final:', {
    host: host,
    port: config.port,
    user: config.user,
    database: config.database
  });

  return new Pool({
    host: host, // Usar IP IPv4 direto
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
  });
}

// Criar pool de forma síncrona
let pool;
let poolPromise = createPool().then(p => {
  pool = p;
  
  // Evento de erro
  pool.on('error', (err) => {
    console.error(' Erro inesperado no pool do PostgreSQL', err);
    process.exit(-1);
  });
  
  return pool;
}).catch(err => {
  console.error(' Erro ao criar pool:', err);
  process.exit(1);
});

// Função para testar conexão
async function testConnection() {
  try {
    console.log(' Aguardando pool estar pronto...');
    await poolPromise;
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
  await poolPromise; // Garantir que pool está pronto
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
  get pool() { return pool; },
  query,
  testConnection
};
