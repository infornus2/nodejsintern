require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure PostgreSQL client
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Route to render login page
app.get('/login', (req, res) => {
    res.render('login');
});

// Route to handle login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    // Replace this with actual authentication logic
    const result = await pool.query('SELECT * FROM users WHERE name = $1 AND password = $2', [username, password]);
    if (result.rows.length > 0) {
        req.session.user = result.rows[0];
        res.redirect('/');
    } else {
        res.redirect('/login');
    }
});

// Route to render signup page
app.get('/signup', (req, res) => {
    res.render('signup');
});

// Route to handle signup
app.post('/signup', async (req, res) => {
    const { username, password, email } = req.body;

    // Check if all required fields are provided
    if (!username || !password || !email) {
        return res.status(400).send('All fields are required');
    }

    try {
        await pool.query('INSERT INTO users (name, password, email) VALUES ($1, $2, $3)', [username, password, email]);
        res.redirect('/login');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// Route to handle viewing an article
app.post('/view/:id', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('Unauthorized');
    }
    const articleId = parseInt(req.params.id);
    try {
        const result = await pool.query('UPDATE articles SET views = views + 1 WHERE id = $1 RETURNING *', [articleId]);
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).send('Article not found');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// Route to render home page with articles
app.get('/', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    try {
        const result = await pool.query('SELECT * FROM articles');
        res.render('home', { articles: result.rows, user: req.session.user });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// Route to handle liking an article
app.post('/like/:id', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('Unauthorized');
    }
    const articleId = parseInt(req.params.id);
    try {
        const result = await pool.query('UPDATE articles SET likes = likes + 1 WHERE id = $1 RETURNING *', [articleId]);
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).send('Article not found');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// Route to handle logout
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error(err);
            return res.status(500).send('Logout failed');
        }
        res.redirect('/login');
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
