-- ============================================
-- SCHEMA DO BANCO DE DADOS - INSTITUTO ALPHAMIND
-- ============================================

-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABELA: users (alunos e admins)
-- ============================================
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  senha VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'aluno' CHECK (role IN ('aluno', 'admin', 'financeiro')),
  telefone VARCHAR(20),
  cpf VARCHAR(14),
  data_nascimento DATE,
  endereco TEXT,
  cidade VARCHAR(100),
  estado VARCHAR(2),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- TABELA: cursos
-- ============================================
CREATE TABLE cursos (
  id SERIAL PRIMARY KEY,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  thumbnail_url VARCHAR(500),
  preco_total DECIMAL(10, 2) NOT NULL,
  duracao_estimada_horas INTEGER,
  nivel VARCHAR(50) DEFAULT 'Iniciante' CHECK (nivel IN ('Iniciante', 'Intermediário', 'Avançado')),
  ativo BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABELA: modulos
-- ============================================
CREATE TABLE modulos (
  id SERIAL PRIMARY KEY,
  curso_id INTEGER NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  preco DECIMAL(10, 2) NOT NULL,
  ordem INTEGER NOT NULL,
  duracao_estimada_horas INTEGER,
  thumbnail_url VARCHAR(500),
  requisitos TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_modulos_curso ON modulos(curso_id);
CREATE INDEX idx_modulos_ordem ON modulos(ordem);

-- ============================================
-- TABELA: aulas
-- ============================================
CREATE TABLE aulas (
  id SERIAL PRIMARY KEY,
  modulo_id INTEGER NOT NULL REFERENCES modulos(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('gravado', 'ao_vivo')),
  video_url VARCHAR(500),
  duracao_minutos INTEGER,
  ordem INTEGER NOT NULL,
  thumbnail_url VARCHAR(500),
  -- Campos para aulas ao vivo
  data_ao_vivo TIMESTAMP,
  link_sala_ao_vivo VARCHAR(500),
  -- Controle
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_aulas_modulo ON aulas(modulo_id);
CREATE INDEX idx_aulas_tipo ON aulas(tipo);
CREATE INDEX idx_aulas_data_ao_vivo ON aulas(data_ao_vivo);

-- ============================================
-- TABELA: recursos (PDFs, slides, etc)
-- ============================================
CREATE TABLE recursos (
  id SERIAL PRIMARY KEY,
  aula_id INTEGER NOT NULL REFERENCES aulas(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('pdf', 'slide', 'exercicio', 'outro')),
  arquivo_url VARCHAR(500) NOT NULL,
  tamanho_kb INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_recursos_aula ON recursos(aula_id);

-- ============================================
-- TABELA: matriculas
-- ============================================
CREATE TABLE matriculas (
  id SERIAL PRIMARY KEY,
  aluno_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  curso_id INTEGER NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('completo', 'modular')),
  status VARCHAR(20) DEFAULT 'ativa' CHECK (status IN ('ativa', 'suspensa', 'cancelada', 'expirada')),
  data_matricula TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_expiracao TIMESTAMP NOT NULL,
  valor_pago DECIMAL(10, 2) NOT NULL,
  desconto_aplicado DECIMAL(10, 2) DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(aluno_id, curso_id)
);

CREATE INDEX idx_matriculas_aluno ON matriculas(aluno_id);
CREATE INDEX idx_matriculas_curso ON matriculas(curso_id);
CREATE INDEX idx_matriculas_status ON matriculas(status);
CREATE INDEX idx_matriculas_expiracao ON matriculas(data_expiracao);

-- ============================================
-- TABELA: pagamentos
-- ============================================
CREATE TABLE pagamentos (
  id SERIAL PRIMARY KEY,
  aluno_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  matricula_id INTEGER REFERENCES matriculas(id) ON DELETE SET NULL,
  modulo_id INTEGER REFERENCES modulos(id) ON DELETE SET NULL,
  valor DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado', 'estornado', 'expirado')),
  forma_pagamento VARCHAR(30) CHECK (forma_pagamento IN ('boleto', 'pix', 'cartao_credito', 'cartao_debito')),
  
  -- Dados do gateway de pagamento
  gateway VARCHAR(50), -- mercadopago, asaas, pagseguro
  transacao_id VARCHAR(255) UNIQUE,
  pix_qr_code TEXT,
  pix_copia_cola TEXT,
  boleto_url VARCHAR(500),
  boleto_codigo_barras VARCHAR(100),
  
  data_pagamento TIMESTAMP,
  data_vencimento TIMESTAMP,
  webhook_data JSONB,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pagamentos_aluno ON pagamentos(aluno_id);
CREATE INDEX idx_pagamentos_status ON pagamentos(status);
CREATE INDEX idx_pagamentos_transacao ON pagamentos(transacao_id);

-- ============================================
-- TABELA: acessos (controle fino por módulo)
-- ============================================
CREATE TABLE acessos (
  id SERIAL PRIMARY KEY,
  aluno_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  modulo_id INTEGER NOT NULL REFERENCES modulos(id) ON DELETE CASCADE,
  liberado BOOLEAN DEFAULT false,
  data_liberacao TIMESTAMP,
  data_expiracao TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(aluno_id, modulo_id)
);

CREATE INDEX idx_acessos_aluno ON acessos(aluno_id);
CREATE INDEX idx_acessos_modulo ON acessos(modulo_id);
CREATE INDEX idx_acessos_liberado ON acessos(liberado);

-- ============================================
-- TABELA: progresso_aulas
-- ============================================
CREATE TABLE progresso_aulas (
  id SERIAL PRIMARY KEY,
  aluno_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  aula_id INTEGER NOT NULL REFERENCES aulas(id) ON DELETE CASCADE,
  tempo_assistido_segundos INTEGER DEFAULT 0,
  percentual_concluido INTEGER DEFAULT 0 CHECK (percentual_concluido >= 0 AND percentual_concluido <= 100),
  concluido BOOLEAN DEFAULT false,
  data_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_conclusao TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(aluno_id, aula_id)
);

CREATE INDEX idx_progresso_aluno ON progresso_aulas(aluno_id);
CREATE INDEX idx_progresso_aula ON progresso_aulas(aula_id);

-- ============================================
-- TABELA: provas
-- ============================================
CREATE TABLE provas (
  id SERIAL PRIMARY KEY,
  modulo_id INTEGER NOT NULL REFERENCES modulos(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  nota_minima DECIMAL(4, 2) DEFAULT 7.0,
  tentativas_maximas INTEGER DEFAULT 3,
  tempo_limite_minutos INTEGER,
  percentual_aulas_necessario INTEGER DEFAULT 80 CHECK (percentual_aulas_necessario >= 0 AND percentual_aulas_necessario <= 100),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_provas_modulo ON provas(modulo_id);

-- ============================================
-- TABELA: questoes
-- ============================================
CREATE TABLE questoes (
  id SERIAL PRIMARY KEY,
  prova_id INTEGER NOT NULL REFERENCES provas(id) ON DELETE CASCADE,
  enunciado TEXT NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('multipla_escolha', 'verdadeiro_falso', 'dissertativa')),
  peso DECIMAL(4, 2) DEFAULT 1.0,
  ordem INTEGER NOT NULL,
  -- Para múltipla escolha
  opcoes JSONB, -- [{"letra": "A", "texto": "...", "correta": true}, ...]
  explicacao TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_questoes_prova ON questoes(prova_id);

-- ============================================
-- TABELA: respostas_prova (tentativas dos alunos)
-- ============================================
CREATE TABLE respostas_prova (
  id SERIAL PRIMARY KEY,
  aluno_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prova_id INTEGER NOT NULL REFERENCES provas(id) ON DELETE CASCADE,
  tentativa INTEGER NOT NULL,
  respostas JSONB NOT NULL, -- [{"questao_id": 1, "resposta": "A"}, ...]
  nota DECIMAL(4, 2),
  aprovado BOOLEAN DEFAULT false,
  tempo_gasto_minutos INTEGER,
  data_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_finalizacao TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_respostas_aluno ON respostas_prova(aluno_id);
CREATE INDEX idx_respostas_prova ON respostas_prova(prova_id);

-- ============================================
-- TABELA: certificados
-- ============================================
CREATE TABLE certificados (
  id SERIAL PRIMARY KEY,
  aluno_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  curso_id INTEGER NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
  hash_verificacao UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
  data_emissao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_conclusao_curso TIMESTAMP NOT NULL,
  carga_horaria_total INTEGER NOT NULL,
  nota_final DECIMAL(4, 2),
  pdf_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(aluno_id, curso_id)
);

CREATE INDEX idx_certificados_aluno ON certificados(aluno_id);
CREATE INDEX idx_certificados_hash ON certificados(hash_verificacao);

-- ============================================
-- TABELA: logs_acesso (auditoria)
-- ============================================
CREATE TABLE logs_acesso (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  acao VARCHAR(100) NOT NULL,
  tabela VARCHAR(50),
  registro_id INTEGER,
  dados_anteriores JSONB,
  dados_novos JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_logs_user ON logs_acesso(user_id);
CREATE INDEX idx_logs_created ON logs_acesso(created_at);

-- ============================================
-- TRIGGERS para updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cursos_updated_at BEFORE UPDATE ON cursos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_modulos_updated_at BEFORE UPDATE ON modulos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_aulas_updated_at BEFORE UPDATE ON aulas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_matriculas_updated_at BEFORE UPDATE ON matriculas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pagamentos_updated_at BEFORE UPDATE ON pagamentos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_acessos_updated_at BEFORE UPDATE ON acessos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_progresso_updated_at BEFORE UPDATE ON progresso_aulas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_provas_updated_at BEFORE UPDATE ON provas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VIEWS ÚTEIS
-- ============================================

-- View: Progresso do aluno por curso
CREATE VIEW vw_progresso_curso AS
SELECT 
  m.aluno_id,
  m.curso_id,
  c.titulo as curso_nome,
  COUNT(DISTINCT pa.aula_id) as aulas_assistidas,
  COUNT(DISTINCT a.id) as total_aulas,
  ROUND(COUNT(DISTINCT pa.aula_id)::NUMERIC / NULLIF(COUNT(DISTINCT a.id), 0) * 100, 2) as percentual_conclusao
FROM matriculas m
JOIN cursos c ON c.id = m.curso_id
JOIN acessos ac ON ac.aluno_id = m.aluno_id AND ac.liberado = true
JOIN modulos mo ON mo.id = ac.modulo_id AND mo.curso_id = m.curso_id
JOIN aulas a ON a.modulo_id = mo.id
LEFT JOIN progresso_aulas pa ON pa.aluno_id = m.aluno_id AND pa.aula_id = a.id AND pa.concluido = true
GROUP BY m.aluno_id, m.curso_id, c.titulo;

-- View: Status das provas por aluno
CREATE VIEW vw_status_provas AS
SELECT 
  ac.aluno_id,
  pr.modulo_id,
  pr.id as prova_id,
  pr.titulo as prova_titulo,
  COUNT(rp.id) as tentativas_realizadas,
  pr.tentativas_maximas,
  MAX(rp.nota) as melhor_nota,
  MAX(CASE WHEN rp.aprovado = true THEN 1 ELSE 0 END) = 1 as ja_aprovado
FROM acessos ac
JOIN provas pr ON pr.modulo_id = ac.modulo_id
LEFT JOIN respostas_prova rp ON rp.aluno_id = ac.aluno_id AND rp.prova_id = pr.id
WHERE ac.liberado = true
GROUP BY ac.aluno_id, pr.modulo_id, pr.id, pr.titulo, pr.tentativas_maximas;

-- ============================================
-- DADOS INICIAIS (SEED)
-- ============================================

-- Admin padrão (senha: admin123)
INSERT INTO users (nome, email, senha, role) VALUES 
('Administrador', 'admin@alphamind.com.br', '$2a$08$YourHashedPasswordHere', 'admin');

-- Curso exemplo
INSERT INTO cursos (titulo, descricao, preco_total, duracao_estimada_horas, nivel) VALUES 
('Teologia Inteligente', 'Curso completo de Teologia com abordagem moderna e prática', 1200.00, 120, 'Intermediário');

-- Módulos exemplo
INSERT INTO modulos (curso_id, titulo, descricao, preco, ordem, duracao_estimada_horas) VALUES 
(1, 'Fundamentos da Fé', 'Conceitos básicos e introdução à Teologia', 200.00, 1, 20),
(1, 'Hermenêutica Bíblica', 'Métodos de interpretação das Escrituras', 200.00, 2, 20),
(1, 'Teologia Sistemática', 'Estudo sistemático das doutrinas cristãs', 200.00, 3, 25),
(1, 'História da Igreja', 'Panorama histórico do cristianismo', 200.00, 4, 20),
(1, 'Homilética', 'Arte e técnica da pregação', 200.00, 5, 20),
(1, 'Ética Cristã', 'Princípios éticos e morais cristãos aplicados', 200.00, 6, 15);
