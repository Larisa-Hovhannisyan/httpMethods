const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { readFile } = require('./helpers/readFile');

const app = express();
app.use(express.json());

app.get('/', async (req, res) => {
    const html = await readFile('pages', 'index.html');
    res.set({
        'Content-Type' : 'text/html',
        'Cache-Control' : 'no-store'
    });
    res.send(html);
});

app.get('/api/users', async (req, res) => {
    const sortOrder = req.query.sort;
    const users = JSON.parse(await readFile('db', 'users.json'));
    let result = [...users];

    if (sortOrder === 'asc') {
        result.sort((a,b) => a.age - b.age);
    } else if (sortOrder === 'desc') {
        result.sort((a,b) => b.age - a.age);
    }

    res.set({
        'Content-Type' : 'application/json',
        'Cache-control' : 'no-store'
    });
    res.json(result);
});

app.get('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const users = JSON.parse(await readFile('db', 'users.json'));
    const user = users.find(u => u.id == id);

    if (!user) {
        const html = await readFile('pages', 'error.html');
        res.set({
            'Content-Type': 'text/html',
            'Cache-Control': 'no-store'
        });
        return res.status(404).send(html);
    }
    res.json(user);
});

app.post('/api/users', async (req, res) => {
    const body = req.body;
    const requiredFields = ["name", "age", "email", "password"];
    const hasAllFields = requiredFields.every(field => body[field]);

    if (!hasAllFields) {
        res.set({
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store'
        });
        return res.status(400).json({ error: "Missing required fields: name, age, email, password" });
    }

    const users = JSON.parse(await readFile('db', 'users.json'));
    if (users.some(user => user.email === body.email)) {
        return res.status(409).json({ error: "User with this email already exists" });
    }

    body.id = Date.now().toString();
    users.push(body);

    await fs.writeFile(path.join(__dirname, 'db', 'users.json'), JSON.stringify(users, null, 2));

    res.set({
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
    });
    res.status(201).json(body);
});

app.patch('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const users = JSON.parse(await readFile('db', 'users.json'));
    const user = users.find(u => u.id === id);

    if (!user) {
        res.set({
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store'
        });
        return res.status(404).json({ message: "User not found" });
    }

    Object.assign(user, updates);
    await fs.writeFile(path.join(__dirname, 'db', 'users.json'), JSON.stringify(users, null, 2));
    res.json(user);
});

app.delete('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const users = JSON.parse(await readFile('db', 'users.json'));
    const index = users.findIndex(u => u.id === id);

    if (index === -1) {
        res.set({
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store'
        });
        return res.status(404).json({ message: "User not found" });
    }

    users.splice(index, 1);
    await fs.writeFile(path.join(__dirname, 'db', 'users.json'), JSON.stringify(users, null, 2));
    res.json({ message: `User ${id} deleted` });
});

app.use(async (req, res) => {
    const html = await readFile('pages', 'error.html');
    res.set({
        'Content-Type': 'text/html',
        'Cache-Control': 'no-store'
    });
    res.status(404).send(html);
});

app.listen(3000, () => console.log('Server is running ...'));
