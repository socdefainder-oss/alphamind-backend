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

app.listen(3000, () => {
  console.log("✅ Backend AlphaMind rodando em http://localhost:3000");
});
