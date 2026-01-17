require("dotenv").config();
const bcrypt = require("bcryptjs");
const { query, pool } = require("./config/database");

async function createAdmin() {
  console.log('👤 Criando usuário administrador...\n');

  try {
    const email = 'admin@alphamind.com.br';
    const senha = 'admin123'; // Senha padrão - MUDAR depois!
    
    // Verificar se já existe
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    
    if (existing.rows.length > 0) {
      console.log('⚠️  Admin já existe!');
      console.log('Email:', email);
      console.log('Use a senha que você cadastrou ou reset via banco');
      await pool.end();
      return;
    }

    // Hash da senha
    const hash = await bcrypt.hash(senha, 8);

    // Criar admin
    await query(
      'INSERT INTO users (nome, email, senha, role) VALUES ($1, $2, $3, $4)',
      ['Administrador', email, hash, 'admin']
    );

    console.log('✅ Administrador criado com sucesso!');
    console.log('\n📧 Email:', email);
    console.log('🔑 Senha:', senha);
    console.log('\n⚠️  IMPORTANTE: Altere essa senha após o primeiro login!\n');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
    process.exit();
  }
}

createAdmin();
