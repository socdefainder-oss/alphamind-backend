const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const app = express();
app.use(cors());
app.use(express.json());

// Banco temporário em memória (depois vamos trocar por PostgreSQL)
const users = [];

const JWT_SECRET = "alphamind_secret";

// Middleware de autenticação
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: "Token não fornecido" });
  }

  const token = authHeader.replace("Bearer ", "");
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userEmail = decoded.email;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Token inválido ou expirado" });
  }
}

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/register", async (req, res) => {
  const { nome, email, senha } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ error: "Preencha nome, email e senha." });
  }

  const existing = users.find(u => u.email === email);
  if (existing) {
    return res.status(409).json({ error: "Email já cadastrado." });
  }

  const hash = await bcrypt.hash(senha, 8);
  users.push({ nome, email, senha: hash });

  res.json({ message: "Usuário criado com sucesso!" });
});

app.post("/login", async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ error: "Preencha email e senha." });
  }

  const user = users.find(u => u.email === email);
  if (!user) return res.status(401).json({ error: "Credenciais inválidas." });

  const ok = await bcrypt.compare(senha, user.senha);
  if (!ok) return res.status(401).json({ error: "Credenciais inválidas." });

  const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: "1d" });
  res.json({ token });
});

// Endpoint para validar token e retornar dados do usuário
app.get("/me", authMiddleware, (req, res) => {
  const user = users.find(u => u.email === req.userEmail);
  
  if (!user) {
    return res.status(404).json({ error: "Usuário não encontrado" });
  }

  // Retorna dados do usuário sem a senha
  res.json({
    nome: user.nome,
    email: user.email
  });
});

app.listen(3000, () => {
  console.log(" Backend AlphaMind rodando em http://localhost:3000");
});
