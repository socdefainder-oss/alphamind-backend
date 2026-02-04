const { Pool } = require('pg');
require('dotenv').config();

// Parse da connection string
const dbUrl = process.env.DATABASE_URL;
console.log('✓ DATABASE_URL:', dbUrl ? 'Definido' : 'UNDEFINED');

if (!dbUrl) {
  console.error('❌ DATABASE_URL não está definido!');
  process.exit(1);
}

// IMPORTANTE: Supabase pgbouncer requer usar a connection string completa,
// NÃO resolver o hostname para IPv4. O pgbouncer precisa do hostname
// para identificar o tenant corretamente.
console.log('✓ Criando pool PostgreSQL (Supabase)...');

// Criar pool diretamente com connection string
const pool = new Pool({
  connectionString: dbUrl,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Evento de erro
pool.on('error', (err) => {
  console.error('❌ Erro inesperado no pool do PostgreSQL', err);
  process.exit(-1);
});

// Função para testar conexão
async function testConnection() {
  try {
    console.log('⏳ Tentando conectar ao PostgreSQL...');
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✓ Conectado ao PostgreSQL (Supabase):', result.rows[0].now);
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar no PostgreSQL:', error.message);
    console.error('❌ Código:', error.code);
    console.error('❌ Stack:', error.stack);
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
