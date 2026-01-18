const bcrypt = require('bcryptjs');
const { query } = require('./config/database');

async function resetAdmin() {
  try {
    const hash = await bcrypt.hash('admin123', 8);
    await query('UPDATE users SET senha = $1 WHERE email = $2', [hash, 'admin@alphamind.com.br']);
    console.log('✅ Senha do admin atualizada para: admin123');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

resetAdmin();
