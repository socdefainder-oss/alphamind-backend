const fs = require('fs');
const path = require('path');
const { pool } = require('./config/database');

async function runSchema() {
  console.log('🚀 Iniciando criação do schema no banco de dados...\n');

  try {
    // Ler o arquivo schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    // Executar o schema
    await pool.query(schema);

    console.log('✅ Schema criado com sucesso!');
    console.log('✅ Tabelas, índices e triggers criados');
    console.log('✅ Dados iniciais (seed) inseridos');
    
    // Verificar as tabelas criadas
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log('\n📋 Tabelas criadas:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    console.log('\n🎉 Banco de dados pronto para uso!');
    
  } catch (error) {
    console.error('❌ Erro ao executar schema:', error.message);
    console.error(error);
  } finally {
    await pool.end();
    process.exit();
  }
}

runSchema();
