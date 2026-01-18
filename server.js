require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { query, testConnection } = require("./config/database");
const adminRoutes = require("./routes/admin");

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "alphamind_secret";

// Middleware de autenticação
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Token não fornecido" });
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    req.userEmail = decoded.email;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Token inválido ou expirado" });
  }
}

// Middleware para verificar role admin
function adminMiddleware(req, res, next) {
  if (req.userRole !== "admin") {
    return res.status(403).json({ error: "Acesso negado. Apenas administradores." });
  }
  next();
}

app.get("/health", (req, res) => {
  res.json({ status: "ok", database: "postgresql" });
});

app.post("/register", async (req, res) => {
  const { nome, email, senha } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ error: "Preencha nome, email e senha." });
  }

  try {
    // Verificar se email já existe
    const existing = await query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Email já cadastrado." });
    }

    // Hash da senha
    const hash = await bcrypt.hash(senha, 8);

    // Inserir usuário
    await query(
      "INSERT INTO users (nome, email, senha, role) VALUES ($1, $2, $3, $4)",
      [nome, email, hash, "aluno"]
    );

    res.json({ message: "Usuário criado com sucesso!" });
  } catch (error) {
    console.error("Erro ao registrar:", error);
    res.status(500).json({ error: "Erro ao criar usuário." });
  }
});

app.post("/login", async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ error: "Preencha email e senha." });
  }

  try {
    // Buscar usuário
    const result = await query(
      "SELECT id, nome, email, senha, role FROM users WHERE email = $1 AND ativo = true",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Credenciais inválidas." });
    }

    const user = result.rows[0];

    // Verificar senha
    const ok = await bcrypt.compare(senha, user.senha);
    if (!ok) {
      return res.status(401).json({ error: "Credenciais inválidas." });
    }

    // Gerar token com id, email e role
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ 
      token,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Erro ao fazer login:", error);
    res.status(500).json({ error: "Erro ao fazer login." });
  }
});

// Endpoint para validar token e retornar dados do usuário
app.get("/me", authMiddleware, async (req, res) => {
  try {
    const result = await query(
      "SELECT id, nome, email, role, telefone, cidade, estado FROM users WHERE id = $1",
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      nome: user.nome,
      email: user.email,
      role: user.role,
      telefone: user.telefone,
      cidade: user.cidade,
      estado: user.estado
    });
  } catch (error) {
    console.error("Erro ao buscar usuário:", error);
    res.status(500).json({ error: "Erro ao buscar dados do usuário." });
  }
});

// Endpoint de teste para admin
app.get("/admin/test", authMiddleware, adminMiddleware, (req, res) => {
  res.json({ message: "Você é um administrador!" });
});

// Rotas administrativas (protegidas por authMiddleware e adminMiddleware)
app.use("/admin", authMiddleware, adminMiddleware, adminRoutes);

// Iniciar servidor
const PORT = process.env.PORT || 3000;

async function startServer() {
  // Testar conexão com o banco
  const connected = await testConnection();
  
  if (!connected) {
    console.error(" Não foi possível conectar ao banco de dados");
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(` Backend AlphaMind rodando em http://localhost:${PORT}`);
    console.log(` Conectado ao PostgreSQL (Supabase)`);
  });
}

startServer();
