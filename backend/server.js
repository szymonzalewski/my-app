const express = require("express");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = 5001;
const SECRET_KEY = "your_secret_key"; // Zmienna tajna do podpisywania tokenów JWT

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Konfiguracja połączenia z bazą danych PostgreSQL
const pool = new Pool({
  user: "postgres", // Twój użytkownik bazy danych
  host: "localhost",
  database: "memoApp", // Twoja baza danych
  password: "2800", // Twoje hasło do bazy danych
  port: 5432,
});

// Utworzenie tabeli użytkowników (jeśli jeszcze nie istnieje)
pool.query(
  `CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL
  )`,
  (err, res) => {
    if (err) {
      console.error("Error creating users table", err);
    } else {
      console.log("Users table created successfully");
    }
  },
);

// Utworzenie tabeli wiadomości (jeśli jeszcze nie istnieje)
pool.query(
  `CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  (err, res) => {
    if (err) {
      console.error("Error creating messages table", err);
    } else {
      console.log("Messages table created successfully");
    }
  },
);

// Endpoint rejestracji
app.post("/register", async (req, res) => {
  const { email, password } = req.body;
  try {
    // Sprawdzenie, czy użytkownik już istnieje
    const userExists = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email],
    );
    if (userExists.rows.length > 0) {
      return res.status(400).send({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
      [email, hashedPassword],
    );
    res
      .status(201)
      .send({ message: "User registered successfully!", user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Internal server error" });
  }
});

// Endpoint logowania
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    console.log("Received login request:", { email, password });
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log("User found:", user);
      const validPassword = await bcrypt.compare(password, user.password);
      console.log("Password valid:", validPassword);
      if (validPassword) {
        const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, {
          expiresIn: "1h",
        });
        res.status(200).send({ message: "Login successful", token });
      } else {
        res.status(401).send({ message: "Invalid credentials" });
      }
    } else {
      res.status(401).send({ message: "Invalid credentials" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Internal server error" });
  }
});

// Middleware do weryfikacji tokenu JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Endpoint do dodawania wiadomości
app.post("/messages", authenticateToken, async (req, res) => {
  const { content } = req.body;
  const userId = req.user.id;
  try {
    const result = await pool.query(
      "INSERT INTO messages (user_id, content) VALUES ($1, $2) RETURNING *",
      [userId, content],
    );
    res
      .status(201)
      .send({
        message: "Message added successfully!",
        message: result.rows[0],
      });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Internal server error" });
  }
});

// Endpoint do pobierania wiadomości użytkownika
app.get("/messages", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await pool.query(
      "SELECT * FROM messages WHERE user_id = $1",
      [userId],
    );
    res.status(200).send(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Internal server error" });
  }
});

// Przykładowy endpoint chroniony autoryzacją
app.get("/protected", authenticateToken, (req, res) => {
  res.send({ message: "This is a protected route", user: req.user });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
