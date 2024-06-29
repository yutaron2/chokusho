const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// データベース接続
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the SQLite database.');
});

// データベーステーブルの作成
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    date TEXT,
    content TEXT,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  db.run('INSERT INTO users (username, password) SELECT ?, ? WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = ?)', ['admin', bcrypt.hashSync('password', 10), 'admin']);
});

// サーバー起動
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
    db.get('SELECT COUNT(*) as count FROM users', [], (err, row) => {
    if (err) {
      console.error('Database error:', err.message);
    } else {
      console.log('Number of users in database:', row.count);
    }
  });
});

// ユーザー登録
app.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], function(err) {
      if (err) {
        return res.status(400).json({ error: 'Username already exists' });
      }
      res.status(201).json({ message: 'User created successfully', userId: this.lastID });
    });
  } catch (error) {
    res.status(500).json({ error: 'Error creating user' });
  }
});

// ログイン
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
  console.log('Login attempt received:', req.body);
    console.log("ddddddddd");
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Error logging in' });
    }
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }
    try {
      if (await bcrypt.compare(password, user.password)) {
        const token = jwt.sign({ userId: user.id }, 'your_jwt_secret', { expiresIn: '1h' });
        res.json({ token });
      } else {
        res.status(400).json({ error: 'Invalid password' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Error logging in' });
    }
  });
});

// 認証ミドルウェア
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, 'your_jwt_secret', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// メモの作成
app.post('/notes', authenticateToken, (req, res) => {
  const { date, content } = req.body;
  const userId = req.user.userId;
  db.run('INSERT INTO notes (user_id, date, content) VALUES (?, ?, ?)', [userId, date, content], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Error creating note' });
    }
    res.status(201).json({ message: 'Note created successfully', noteId: this.lastID });
  });
});

// メモの取得
app.get('/notes', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  db.all('SELECT * FROM notes WHERE user_id = ?', [userId], (err, notes) => {
    if (err) {
      return res.status(500).json({ error: 'Error fetching notes' });
    }
    res.json(notes);
  });
});

// メモの更新
app.put('/notes/:id', authenticateToken, (req, res) => {
  const { content } = req.body;
  const noteId = req.params.id;
  const userId = req.user.userId;
  db.run('UPDATE notes SET content = ? WHERE id = ? AND user_id = ?', [content, noteId, userId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Error updating note' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Note not found or unauthorized' });
    }
    res.json({ message: 'Note updated successfully' });
  });
});

// メモの削除
app.delete('/notes/:id', authenticateToken, (req, res) => {
  const noteId = req.params.id;
  const userId = req.user.userId;
  db.run('DELETE FROM notes WHERE id = ? AND user_id = ?', [noteId, userId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Error deleting note' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Note not found or unauthorized' });
    }
    res.json({ message: 'Note deleted successfully' });
  });
});
