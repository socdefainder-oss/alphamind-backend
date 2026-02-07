const express = require('express');
const router = express.Router();
const { query } = require('../config/database');

// ========== CURSOS ==========

// Listar todos os cursos
router.get('/cursos', async (req, res) => {
  try {
    const result = await query(
      `SELECT c.*, 
        (SELECT COUNT(*) FROM modulos WHERE curso_id = c.id) as total_modulos
       FROM cursos c 
       ORDER BY c.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar cursos:', error);
    res.status(500).json({ error: 'Erro ao listar cursos' });
  }
});

// Buscar curso por ID
router.get('/cursos/:id', async (req, res) => {
  try {
    const result = await query(
      `SELECT c.*, 
        (SELECT COUNT(*) FROM modulos WHERE curso_id = c.id) as total_modulos
       FROM cursos c 
       WHERE c.id = $1`,
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar curso:', error);
    res.status(500).json({ error: 'Erro ao buscar curso' });
  }
});

// Criar novo curso
router.post('/cursos', async (req, res) => {
  const { titulo, descricao, thumbnail_url, preco_total, duracao_estimada_horas, ativo } = req.body;

  if (!titulo || !descricao || !preco_total) {
    return res.status(400).json({ error: 'Preencha título, descrição e preço' });
  }

  try {
    const result = await query(
      `INSERT INTO cursos (titulo, descricao, thumbnail_url, preco_total, duracao_estimada_horas, ativo) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [titulo, descricao, thumbnail_url || null, preco_total, duracao_estimada_horas || 0, ativo !== false]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar curso:', error);
    res.status(500).json({ error: 'Erro ao criar curso', message: error.message });
  }
});

// Atualizar curso
router.put('/cursos/:id', async (req, res) => {
  const { titulo, descricao, thumbnail_url, preco_total, duracao_estimada_horas, ativo } = req.body;

  try {
    const result = await query(
      `UPDATE cursos 
       SET titulo = COALESCE($1, titulo),
           descricao = COALESCE($2, descricao),
           thumbnail_url = COALESCE($3, thumbnail_url),
           preco_total = COALESCE($4, preco_total),
           duracao_estimada_horas = COALESCE($5, duracao_estimada_horas),
           ativo = COALESCE($6, ativo),
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [titulo, descricao, thumbnail_url, preco_total, duracao_estimada_horas, ativo, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar curso:', error);
    res.status(500).json({ error: 'Erro ao atualizar curso', message: error.message });
  }
});

// Deletar curso
router.delete('/cursos/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM cursos WHERE id = $1 RETURNING id', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }

    res.json({ message: 'Curso deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar curso:', error);
    res.status(500).json({ error: 'Erro ao deletar curso' });
  }
});

// ========== MÓDULOS ==========

// Listar módulos de um curso
router.get('/cursos/:cursoId/modulos', async (req, res) => {
  try {
    const result = await query(
      `SELECT m.*, 
        (SELECT COUNT(*) FROM aulas WHERE modulo_id = m.id) as total_aulas
       FROM modulos m 
       WHERE m.curso_id = $1 
       ORDER BY m.ordem`,
      [req.params.cursoId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar módulos:', error);
    res.status(500).json({ error: 'Erro ao listar módulos' });
  }
});

// Criar novo módulo
router.post('/cursos/:cursoId/modulos', async (req, res) => {
  const { titulo, descricao, ordem, preco, duracao_estimada_horas } = req.body;
  const { cursoId } = req.params;

  if (!titulo) {
    return res.status(400).json({ error: 'Título é obrigatório' });
  }

  try {
    const result = await query(
      `INSERT INTO modulos (curso_id, titulo, descricao, ordem, preco, duracao_estimada_horas) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [cursoId, titulo, descricao, ordem, preco || 0, duracao_estimada_horas]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar módulo:', error);
    console.error('Erro detalhado:', error.message);
    res.status(500).json({ error: 'Erro ao criar módulo', details: error.message });
  }
});

// Buscar módulo específico por ID
router.get('/modulos/:id', async (req, res) => {
  try {
    const result = await query(
      `SELECT m.*, c.titulo as curso_titulo, c.id as curso_id
       FROM modulos m
       LEFT JOIN cursos c ON m.curso_id = c.id
       WHERE m.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Módulo não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar módulo:', error);
    res.status(500).json({ error: 'Erro ao buscar módulo' });
  }
});

// Atualizar módulo
router.put('/modulos/:id', async (req, res) => {
  const { titulo, descricao, ordem, preco, duracao_estimada_horas } = req.body;

  try {
    console.log('Atualizando módulo:', req.params.id);
    console.log('Dados recebidos:', { titulo, descricao, ordem, preco, duracao_estimada_horas });

    const result = await query(
      `UPDATE modulos 
       SET titulo = COALESCE($1, titulo),
           descricao = COALESCE($2, descricao),
           ordem = COALESCE($3, ordem),
           preco = COALESCE($4, preco),
           duracao_estimada_horas = COALESCE($5, duracao_estimada_horas),
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [titulo, descricao, ordem, preco, duracao_estimada_horas, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Módulo não encontrado' });
    }

    console.log('Módulo atualizado:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar módulo:', error);
    console.error('Erro detalhado:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: 'Erro ao atualizar módulo', details: error.message });
  }
});

// Deletar módulo
router.delete('/modulos/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM modulos WHERE id = $1 RETURNING id', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Módulo não encontrado' });
    }

    res.json({ message: 'Módulo deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar módulo:', error);
    res.status(500).json({ error: 'Erro ao deletar módulo' });
  }
});

// ========== AULAS ==========

// Listar aulas de um módulo
router.get('/modulos/:moduloId/aulas', async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM aulas 
       WHERE modulo_id = $1 
       ORDER BY ordem`,
      [req.params.moduloId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar aulas:', error);
    res.status(500).json({ error: 'Erro ao listar aulas' });
  }
});

// Criar nova aula
router.post('/modulos/:moduloId/aulas', async (req, res) => {
  const { titulo, tipo, conteudo_url, conteudo_texto, duracao_minutos, ordem } = req.body;
  const { moduloId } = req.params;

  if (!titulo || !tipo) {
    return res.status(400).json({ error: 'Título e tipo são obrigatórios' });
  }

  try {
    const result = await query(
      `INSERT INTO aulas (modulo_id, titulo, tipo, video_url, descricao, duracao_minutos, ordem, ativo) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [
        moduloId, 
        titulo, 
        tipo === 'video' ? 'gravado' : 'gravado', // mapear para tipos do schema
        conteudo_url || null, 
        conteudo_texto || null, // usar descricao para guardar texto
        duracao_minutos || null, 
        ordem, 
        true
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar aula:', error);
    res.status(500).json({ error: 'Erro ao criar aula', details: error.message });
  }
});

// Atualizar aula
router.put('/aulas/:id', async (req, res) => {
  const { titulo, tipo, conteudo_url, conteudo_texto, duracao_minutos, ordem } = req.body;

  try {
    const result = await query(
      `UPDATE aulas 
       SET titulo = COALESCE($1, titulo),
           tipo = COALESCE($2, tipo),
           video_url = $3,
           descricao = $4,
           duracao_minutos = $5,
           ordem = COALESCE($6, ordem),
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [titulo, tipo === 'video' ? 'gravado' : 'gravado', conteudo_url, conteudo_texto, duracao_minutos, ordem, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Aula não encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar aula:', error);
    res.status(500).json({ error: 'Erro ao atualizar aula', details: error.message });
  }
});

// Deletar aula
router.delete('/aulas/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM aulas WHERE id = $1 RETURNING id', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Aula não encontrada' });
    }

    res.json({ message: 'Aula deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar aula:', error);
    res.status(500).json({ error: 'Erro ao deletar aula' });
  }
});

// ========== USUÁRIOS ==========

// Listar todos os usuários
router.get('/users', async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        u.id, 
        u.nome, 
        u.email, 
        u.role, 
        u.ativo,
        u.created_at,
        u.updated_at,
        COUNT(DISTINCT m.curso_id) as total_cursos_matriculados,
        COUNT(DISTINCT p.id) as total_aulas_assistidas
       FROM users u
       LEFT JOIN matriculas m ON u.id = m.aluno_id
       LEFT JOIN progresso_aulas p ON u.id = p.aluno_id
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
});

// Buscar usuário por ID com detalhes
router.get('/users/:id', async (req, res) => {
  try {
    const userResult = await query(
      `SELECT id, nome, email, role, ativo, created_at, updated_at 
       FROM users WHERE id = $1`,
      [req.params.id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const user = userResult.rows[0];

    // Buscar cursos matriculados
    const cursosResult = await query(
      `SELECT c.id, c.titulo, m.data_matricula
       FROM matriculas m
       JOIN cursos c ON m.curso_id = c.id
       WHERE m.aluno_id = $1
       ORDER BY m.data_matricula DESC`,
      [req.params.id]
    );

    user.cursos_matriculados = cursosResult.rows;

    res.json(user);
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
});

// Buscar progresso detalhado do usuário
router.get('/users/:id/progress', async (req, res) => {
  try {
    // Buscar aulas assistidas por curso
    const progressoResult = await query(
      `SELECT 
        c.id as curso_id,
        c.titulo as curso_titulo,
        COALESCE(
          ROUND(
            (COUNT(DISTINCT CASE WHEN p.concluido = true THEN p.aula_id END)::numeric / 
             NULLIF(COUNT(DISTINCT a.id), 0) * 100), 0
          ), 0
        ) as progresso_geral,
        json_agg(
          json_build_object(
            'aula_id', a.id,
            'aula_titulo', a.titulo,
            'modulo_titulo', mo.titulo,
            'assistido_em', p.data_conclusao,
            'concluido', p.concluido
          ) ORDER BY mo.ordem, a.ordem
        ) as aulas
       FROM matriculas m
       JOIN cursos c ON m.curso_id = c.id
       LEFT JOIN modulos mo ON mo.curso_id = c.id
       LEFT JOIN aulas a ON a.modulo_id = mo.id
       LEFT JOIN progresso_aulas p ON p.aula_id = a.id AND p.aluno_id = m.aluno_id
       WHERE m.aluno_id = $1
       GROUP BY c.id, c.titulo
       ORDER BY c.titulo`,
      [req.params.id]
    );

    res.json(progressoResult.rows);
  } catch (error) {
    console.error('Erro ao buscar progresso:', error);
    res.status(500).json({ error: 'Erro ao buscar progresso' });
  }
});

// Criar novo usuário
router.post('/users', async (req, res) => {
  const { nome, email, password, role, ativo } = req.body;

  if (!nome || !email || !password) {
    return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
  }

  if (!['admin', 'aluno'].includes(role)) {
    return res.status(400).json({ error: 'Role deve ser admin ou aluno' });
  }

  try {
    // Verificar se email já existe
    const checkEmail = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (checkEmail.rows.length > 0) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await query(
      `INSERT INTO users (nome, email, password, role, ativo) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, nome, email, role, ativo, created_at`,
      [nome, email, hashedPassword, role, ativo !== false]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({ error: 'Erro ao criar usuário', message: error.message });
  }
});

// Atualizar usuário (incluindo ativar/desativar)
router.put('/users/:id', async (req, res) => {
  const { nome, email, role, ativo, password } = req.body;

  try {
    // Se password foi enviado, atualizar também
    if (password) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const result = await query(
        `UPDATE users 
         SET nome = COALESCE($1, nome),
             email = COALESCE($2, email),
             role = COALESCE($3, role),
             ativo = COALESCE($4, ativo),
             password = $5,
             updated_at = NOW()
         WHERE id = $6
         RETURNING id, nome, email, role, ativo, created_at, updated_at`,
        [nome, email, role, ativo, hashedPassword, req.params.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      return res.json(result.rows[0]);
    }

    const result = await query(
      `UPDATE users 
       SET nome = COALESCE($1, nome),
           email = COALESCE($2, email),
           role = COALESCE($3, role),
           ativo = COALESCE($4, ativo),
           updated_at = NOW()
       WHERE id = $5
       RETURNING id, nome, email, role, ativo, created_at, updated_at`,
      [nome, email, role, ativo, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ error: 'Erro ao atualizar usuário', message: error.message });
  }
});

// Deletar usuário
router.delete('/users/:id', async (req, res) => {
  try {
    // Verificar se não é o próprio usuário (adicionar validação de token depois)
    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({ message: 'Usuário deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar usuário:', error);
    res.status(500).json({ error: 'Erro ao deletar usuário' });
  }
});

module.exports = router;
