const express = require('express');
const router = express.Router();
const { query } = require('../config/database');

// ========== CURSOS DISPONÍVEIS ==========

// Listar todos os cursos disponíveis (catálogo)
router.get('/cursos', async (req, res) => {
  try {
    const result = await query(
      `SELECT c.*, 
        COUNT(DISTINCT m.id) as total_modulos,
        COUNT(DISTINCT a.id) as total_aulas,
        SUM(a.duracao_minutos) as duracao_total_minutos
       FROM cursos c
       LEFT JOIN modulos m ON c.id = m.curso_id
       LEFT JOIN aulas a ON m.id = a.modulo_id
       WHERE c.ativo = true
       GROUP BY c.id
       ORDER BY c.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar cursos:', error);
    res.status(500).json({ error: 'Erro ao listar cursos' });
  }
});

// Buscar curso específico com módulos e aulas
router.get('/cursos/:cursoId', async (req, res) => {
  try {
    // Buscar curso
    const cursoResult = await query(
      'SELECT * FROM cursos WHERE id = $1 AND ativo = true',
      [req.params.cursoId]
    );

    if (cursoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }

    const curso = cursoResult.rows[0];

    // Buscar módulos com aulas
    const modulosResult = await query(
      `SELECT m.*,
        COUNT(a.id) as total_aulas,
        SUM(a.duracao_minutos) as duracao_total_minutos
       FROM modulos m
       LEFT JOIN aulas a ON m.id = a.modulo_id
       WHERE m.curso_id = $1
       GROUP BY m.id
       ORDER BY m.ordem`,
      [req.params.cursoId]
    );

    curso.modulos = modulosResult.rows;

    // Para cada módulo, buscar suas aulas
    for (let modulo of curso.modulos) {
      const aulasResult = await query(
        `SELECT * FROM aulas 
         WHERE modulo_id = $1 AND ativo = true
         ORDER BY ordem`,
        [modulo.id]
      );
      modulo.aulas = aulasResult.rows;
    }

    res.json(curso);
  } catch (error) {
    console.error('Erro ao buscar curso:', error);
    res.status(500).json({ error: 'Erro ao buscar curso' });
  }
});

// ========== MATRÍCULAS DO ALUNO ==========

// Listar cursos matriculados do aluno logado
router.get('/minhas-matriculas', async (req, res) => {
  const userId = req.userId; // do authMiddleware

  try {
    const result = await query(
      `SELECT m.*, c.*,
        m.id as matricula_id,
        m.data_matricula,
        m.data_validade,
        m.status as status_matricula,
        COUNT(DISTINCT pa.id) as aulas_concluidas,
        COUNT(DISTINCT a.id) as total_aulas,
        CASE 
          WHEN COUNT(DISTINCT a.id) > 0 
          THEN ROUND((COUNT(DISTINCT pa.id)::numeric / COUNT(DISTINCT a.id)::numeric) * 100, 2)
          ELSE 0 
        END as progresso_percentual
       FROM matriculas m
       JOIN cursos c ON m.curso_id = c.id
       LEFT JOIN modulos mo ON c.id = mo.curso_id
       LEFT JOIN aulas a ON mo.id = a.modulo_id
       LEFT JOIN progresso_aulas pa ON a.id = pa.aula_id AND pa.user_id = m.user_id AND pa.concluida = true
       WHERE m.user_id = $1 AND m.status = 'ativa'
       GROUP BY m.id, c.id
       ORDER BY m.data_matricula DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar matrículas:', error);
    res.status(500).json({ error: 'Erro ao listar matrículas' });
  }
});

// Verificar se aluno está matriculado em um curso
router.get('/matricula/:cursoId', async (req, res) => {
  const userId = req.userId;

  try {
    const result = await query(
      `SELECT * FROM matriculas 
       WHERE user_id = $1 AND curso_id = $2 AND status = 'ativa'`,
      [userId, req.params.cursoId]
    );

    if (result.rows.length === 0) {
      return res.json({ matriculado: false });
    }

    res.json({ matriculado: true, matricula: result.rows[0] });
  } catch (error) {
    console.error('Erro ao verificar matrícula:', error);
    res.status(500).json({ error: 'Erro ao verificar matrícula' });
  }
});

// ========== PROGRESSO DO ALUNO ==========

// Obter progresso detalhado em um curso
router.get('/progresso/:cursoId', async (req, res) => {
  const userId = req.userId;
  const { cursoId } = req.params;

  try {
    // Verificar se está matriculado
    const matriculaResult = await query(
      'SELECT * FROM matriculas WHERE user_id = $1 AND curso_id = $2 AND status = $3',
      [userId, cursoId, 'ativa']
    );

    if (matriculaResult.rows.length === 0) {
      return res.status(403).json({ error: 'Você não está matriculado neste curso' });
    }

    // Buscar progresso por módulo
    const progressoResult = await query(
      `SELECT 
        m.id as modulo_id,
        m.titulo as modulo_titulo,
        m.ordem as modulo_ordem,
        COUNT(DISTINCT a.id) as total_aulas,
        COUNT(DISTINCT CASE WHEN pa.concluida = true THEN pa.id END) as aulas_concluidas,
        CASE 
          WHEN COUNT(DISTINCT a.id) > 0 
          THEN ROUND((COUNT(DISTINCT CASE WHEN pa.concluida = true THEN pa.id END)::numeric / COUNT(DISTINCT a.id)::numeric) * 100, 2)
          ELSE 0 
        END as progresso_percentual
       FROM modulos m
       LEFT JOIN aulas a ON m.id = a.modulo_id
       LEFT JOIN progresso_aulas pa ON a.id = pa.aula_id AND pa.user_id = $1
       WHERE m.curso_id = $2
       GROUP BY m.id
       ORDER BY m.ordem`,
      [userId, cursoId]
    );

    res.json({
      matricula: matriculaResult.rows[0],
      modulos: progressoResult.rows
    });
  } catch (error) {
    console.error('Erro ao buscar progresso:', error);
    res.status(500).json({ error: 'Erro ao buscar progresso' });
  }
});

// Marcar aula como concluída
router.post('/aulas/:aulaId/concluir', async (req, res) => {
  const userId = req.userId;
  const { aulaId } = req.params;

  try {
    // Verificar se já existe progresso para essa aula
    const existingProgress = await query(
      'SELECT * FROM progresso_aulas WHERE user_id = $1 AND aula_id = $2',
      [userId, aulaId]
    );

    if (existingProgress.rows.length > 0) {
      // Atualizar para concluída
      await query(
        'UPDATE progresso_aulas SET concluida = true, data_conclusao = NOW() WHERE user_id = $1 AND aula_id = $2',
        [userId, aulaId]
      );
    } else {
      // Inserir novo registro
      await query(
        'INSERT INTO progresso_aulas (user_id, aula_id, concluida, data_conclusao) VALUES ($1, $2, true, NOW())',
        [userId, aulaId]
      );
    }

    res.json({ message: 'Aula marcada como concluída' });
  } catch (error) {
    console.error('Erro ao marcar aula como concluída:', error);
    res.status(500).json({ error: 'Erro ao marcar aula como concluída' });
  }
});

// Desmarcar aula como concluída
router.post('/aulas/:aulaId/desconcluir', async (req, res) => {
  const userId = req.userId;
  const { aulaId } = req.params;

  try {
    await query(
      'UPDATE progresso_aulas SET concluida = false, data_conclusao = NULL WHERE user_id = $1 AND aula_id = $2',
      [userId, aulaId]
    );

    res.json({ message: 'Aula desmarcada' });
  } catch (error) {
    console.error('Erro ao desmarcar aula:', error);
    res.status(500).json({ error: 'Erro ao desmarcar aula' });
  }
});

// Obter aulas concluídas do aluno em um módulo
router.get('/modulos/:moduloId/progresso', async (req, res) => {
  const userId = req.userId;
  const { moduloId } = req.params;

  try {
    const result = await query(
      `SELECT a.id, a.titulo, a.ordem, 
        CASE WHEN pa.concluida = true THEN true ELSE false END as concluida,
        pa.data_conclusao
       FROM aulas a
       LEFT JOIN progresso_aulas pa ON a.id = pa.aula_id AND pa.user_id = $1
       WHERE a.modulo_id = $2
       ORDER BY a.ordem`,
      [userId, moduloId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar progresso do módulo:', error);
    res.status(500).json({ error: 'Erro ao buscar progresso' });
  }
});

module.exports = router;
