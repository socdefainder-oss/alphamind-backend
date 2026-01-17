const fs = require('fs');
const path = require('path');
const { pool } = require('./config/database');

async function resetDatabase() {
  console.log('🔄 Resetando banco de dados...\n');

  try {
    // Dropar todas as tabelas (cascade para remover dependências)
    console.log('🗑️  Removendo tabelas existentes...');
    
    await pool.query(`
      DROP TABLE IF EXISTS logs_acesso CASCADE;
      DROP TABLE IF EXISTS certificados CASCADE;
      DROP TABLE IF EXISTS respostas_prova CASCADE;
      DROP TABLE IF EXISTS questoes CASCADE;
      DROP TABLE IF EXISTS provas CASCADE;
      DROP TABLE IF EXISTS progresso_aulas CASCADE;
      DROP TABLE IF EXISTS acessos CASCADE;
      DROP TABLE IF EXISTS pagamentos CASCADE;
      DROP TABLE IF EXISTS matriculas CASCADE;
      DROP TABLE IF EXISTS recursos CASCADE;
      DROP TABLE IF EXISTS aulas CASCADE;
      DROP TABLE IF EXISTS modulos CASCADE;
      DROP TABLE IF EXISTS cursos CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      
      DROP VIEW IF EXISTS vw_progresso_curso CASCADE;
      DROP VIEW IF EXISTS vw_status_provas CASCADE;
      
      DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
    `);

    console.log('✅ Tabelas removidas');

    // Ler e executar o schema.sql
    console.log('\n📄 Criando novo schema...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    await pool.query(schema);

    console.log('✅ Schema criado com sucesso!');
    
    // Verificar as tabelas criadas
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log('\n📋 Tabelas criadas:');
    result.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });

    console.log('\n🎉 Banco de dados resetado e pronto para uso!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error);
  } finally {
    await pool.end();
    process.exit();
  }
}

resetDatabase();
