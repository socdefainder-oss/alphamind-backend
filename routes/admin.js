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
  const { titulo, descricao, preco_total, duracao_estimada_horas, ativo } = req.body;

  if (!titulo || !descricao || !preco_total) {
    return res.status(400).json({ error: 'Preencha título, descrição e preço' });
  }

  try {
    const result = await query(
      `INSERT INTO cursos (titulo, descricao, preco_total, duracao_estimada_horas, ativo) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [titulo, descricao, preco_total, duracao_estimada_horas || 0, ativo !== false]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar curso:', error);
    res.status(500).json({ error: 'Erro ao criar curso', message: error.message });
  }
});

// Atualizar curso
router.put('/cursos/:id', async (req, res) => {
  const { titulo, descricao, preco_total, duracao_estimada_horas, ativo } = req.body;

  try {
    const result = await query(
      `UPDATE cursos 
       SET titulo = COALESCE($1, titulo),
           descricao = COALESCE($2, descricao),
           preco_total = COALESCE($3, preco_total),
           duracao_estimada_horas = COALESCE($4, duracao_estimada_horas),
           ativo = COALESCE($5, ativo),
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [titulo, descricao, preco_total, duracao_estimada_horas, ativo, req.params.id]
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

module.exports = router;
