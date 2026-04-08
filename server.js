const express = require('express');
const fs = require('fs');
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const { exec, spawn } = require('child_process');

const app = express();
const PORT = 3000;
const MEDIA_DIR = 'playlists';
const USERS_FILE = 'users.json';

let users = {};

// Change users
if (fs.existsSync(USERS_FILE)) {
  users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  for (const user in users) {
    if (!users[user].favorites) users[user].favorites = [];
  }
}

// Middlewares
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use('/playlists', express.static(MEDIA_DIR));

// Auth middleware
app.use((req, res, next) => {
  if (['/', '/login', '/account'].includes(req.path)) return next();
  const authUser = req.cookies.auth;
  if (authUser && users[authUser]) {
    req.user = authUser;
    return next();
  }
  res.redirect('/login');
});

// Login page
app.get('/login', (req, res) => {
  res.send(`
    <style>
      body { background: #111; color: #fff; font-family: sans-serif; text-align: center; padding: 50px; }
      input, button { padding: 10px; margin: 10px; font-size: 16px; }
    </style>
    <form method="POST" action="/login">
      <h2>Connection</h2>
      <input type="text" name="username" placeholder="Login" required />
      <br>
      <input type="password" name="password" placeholder="Password" required />
      <br>
      <button type="submit">Login</button>
    </form>
  `);
});

// Login handler
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (users[username] && users[username].password === password) {
    res.cookie('auth', username);
    return res.redirect('/ci');
  }

  const info = {
    ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
    method: req.method,
    path: req.path,
    fullUrl: req.originalUrl,
    protocol: req.protocol,
    userAgent: req.headers['user-agent'],
    language: req.headers['accept-language'],
    referer: req.headers['referer'] || null,
    cookies: req.cookies,
    query: req.query,
    headers: req.headers,
    body: req.body,
    isSecure: req.secure,
    loginAttemp: username,
    passwordAttemp: password,
  };

  console.log('LOGIN FAILED');
  console.log('Client info :', info);

  res.send(`
    <p style="color:red;">❌ Identifiant ou mot de passe incorrect.</p>
    <a href="/login">Réessayer</a>
  `);
});

// Account page
app.get('/account', (req, res) => {
  const username = req.cookies.auth;
  if (!username || !users[username]) return res.redirect('/login');

  res.send(`
    <style>
      body { background: #111; color: #f0f0f0; font-family: 'Segoe UI', sans-serif; padding: 40px 20px; max-width: 500px; margin: auto; }
      h2, h3 { color: #b47eff; margin-bottom: 20px; }
      form { background: #1d1d2b; border-radius: 12px; padding: 20px; box-shadow: 0 0 10px #0005; margin-bottom: 30px; }
      input[type="password"] { width: 100%; padding: 12px; margin: 10px 0; font-size: 16px; border: none; border-radius: 8px; background: #2a1f45; color: #fff; box-sizing: border-box; }
      button { background: #b47eff; color: #fff; padding: 12px 20px; border: none; font-size: 16px; font-weight: bold; border-radius: 8px; cursor: pointer; transition: background 0.2s; }
      button:hover { background: #9e5dff; }
      a { display: block; color: #70a0ff; text-decoration: none; margin-bottom: 10px; font-weight: bold; }
      a:hover { text-decoration: underline; }
      #admin-section { background: #1d1d2b; padding: 20px; border-radius: 12px; box-shadow: 0 0 10px #0005; }
      #restartPassword { width: 100%; margin: 10px 0; padding: 12px; font-size: 16px; border: none; border-radius: 8px; background: #2a1f45; color: #fff; box-sizing: border-box; }
    </style>
    <h2>Welcome ${username}</h2>
    <form method="POST" action="/account">
      <h3>Change password</h3>
      <input type="password" name="oldPassword" placeholder="Old password" required />
      <input type="password" name="newPassword" placeholder="New password" required />
      <button type="submit">Update</button>
    </form>
    <script>
      document.getElementById("restartBtn").addEventListener("click", () => {
        const password = document.getElementById("restartPassword").value;
        fetch("/admin/restart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password })
        })
          .then(res => { if (!res.ok) throw new Error("Accès refusé"); return res.text(); })
          .then(msg => alert(msg))
          .catch(err => alert("⛔ " + err.message));
      });
    </script>
    <br><br>
    <a href="/">⬅️ Back</a>
    <br>
    <a href="/login">🚪 Change user ?</a>
  `);
});

// Admin restrictions
function restrictToAdmin(req, res, next) {
  const user = req.cookies.auth;
  if (user !== 'admiiin') return res.status(403).send('Accès refusé');
  next();
}

const ADMIN_PASSWORD = users['admiiin']?.password || '';

// Restart server
app.post('/admin/restart', restrictToAdmin, express.json(), (req, res) => {
  const user = req.cookies.auth;
  const { password } = req.body;

  if (!password || password !== ADMIN_PASSWORD) {
    console.warn(`[⚠️] Tentative de redémarrage refusée pour ${user}`);
    return res.status(403).send('Mot de passe incorrect.');
  }

  res.send('✅ Redémarrage en cours...');
  const child = spawn('bash', ['restart_server.sh'], { detached: true, stdio: 'ignore' });
  child.unref();
});

// Update password
app.post('/account', (req, res) => {
  const username = req.cookies.auth;
  const { oldPassword, newPassword } = req.body;

  if (!users[username] || users[username].password !== oldPassword) {
    return res.send(`
      <p style="color:red;">❌ Ancien mot de passe incorrect.</p>
      <a href="/account">Back</a>
    `);
  }

  users[username].password = newPassword;
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

  res.send(`
    <p style="color:lightgreen;">✅ Mot de passe mis à jour !</p>
    <a href="/">Back</a>
  `);
});

app.get('/api/playlists', (req, res) => {
  const user = req.user;
  const userDir = path.join(MEDIA_DIR, user);

  if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });

  const dirs = fs.readdirSync(userDir).filter(f =>
    fs.statSync(path.join(userDir, f)).isDirectory()
  );

  const data = dirs.map(playlist => {
    const playlistPath = path.join(userDir, playlist);
    const files = fs.readdirSync(playlistPath);

    const tracks = files
      .filter(f => f.toLowerCase().endsWith('.mp3'))
      .map(mp3 => {
        const base = mp3.replace(/(?:\.mp3)+$/i, '');
        const image = files.find(f =>
          f.toLowerCase().startsWith(base.toLowerCase()) && f.toLowerCase().endsWith('.jpg')
        );

        return {
          title: base,
          audio: `/playlists/${encodeURIComponent(user)}/${encodeURIComponent(playlist)}/${encodeURIComponent(mp3)}`,
          image: image
            ? `/playlists/${encodeURIComponent(user)}/${encodeURIComponent(playlist)}/${encodeURIComponent(image)}`
            : null
        };
      });

    return { name: playlist, tracks };
  });

// --- Playlist "Favorites" ---
const favTracks = (users[user].favorites || []).map(audioPath => {
  const audioRel = audioPath; // client side relative path
  const folder = decodeURIComponent(path.dirname(audioPath).split('/').pop());
  const base = decodeURIComponent(path.basename(audioPath, '.mp3'));

  // find the image for the title
  const playlistPath = path.join(MEDIA_DIR, user, folder);
  const files = fs.existsSync(playlistPath) ? fs.readdirSync(playlistPath) : [];
  const imageFile = files.find(f =>
    f.toLowerCase().startsWith(base.toLowerCase()) && f.toLowerCase().endsWith('.jpg')
  );

  return {
    title: base,
    audio: audioRel,
    image: imageFile
      ? `/playlists/${encodeURIComponent(user)}/${encodeURIComponent(folder)}/${encodeURIComponent(imageFile)}`
      : null
  };
});



	if (favTracks.length > 0) {
    data.unshift({ name: 'Favoris', tracks: favTracks });
  }

  res.json(data);
});


// favorites API
app.get('/api/favorites', (req, res) => {
  const user = req.user;
  if (!users[user].favorites) users[user].favorites = [];
  res.json(users[user].favorites);
});

app.post('/api/favorites/toggle', (req, res) => {
  const user = req.user;
  const { audio } = req.body;

  if (!audio) return res.status(400).json({ error: 'Fichier audio requis' });

  if (!users[user].favorites) users[user].favorites = [];
  const favs = users[user].favorites;
  const index = favs.indexOf(audio);

  if (index >= 0) favs.splice(index, 1);
  else favs.push(audio);

  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  res.json({ success: true, favorites: favs });
});

// create playlist
app.post('/api/create-playlist', (req, res) => {
  const name = req.body.name?.trim();
  const user = req.user;

  if (!name) return res.status(400).json({ error: 'Nom invalide' });

  const dirPath = path.join(MEDIA_DIR, user, name);
  if (fs.existsSync(dirPath)) return res.status(409).json({ error: 'Playlist déjà existante' });

  try {
    fs.mkdirSync(dirPath, { recursive: true });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Erreur lors de la création' });
  }
});

// delete playlist
app.delete('/api/delete-playlist/:name', (req, res) => {
  const name = req.params.name;
  const user = req.user;
  const dirPath = path.join(MEDIA_DIR, user, name);

  if (!fs.existsSync(dirPath)) return res.status(404).json({ error: 'Introuvable' });

  try {
    fs.rmSync(dirPath, { recursive: true, force: true });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

// Downloading
function sanitize(str) {
  return str.replace(/[^a-zA-Z0-9_\- ]/g, '_');
}

app.post('/api/download', (req, res) => {
  const { url, playlist } = req.body;
  const user = sanitize(req.user || 'anonymous');

  if (!url || !/^https?:\/\/.+$/.test(url)) {
    return res.status(400).json({ error: 'URL invalide' });
  }
  if (!playlist || typeof playlist !== 'string') {
    return res.status(400).json({ error: 'Nom de playlist invalide' });
  }

  const safeUrl = url.trim();
  const safePlaylist = sanitize(playlist);
  const safePath = path.join('playlists', user, safePlaylist);

  fs.mkdirSync(safePath, { recursive: true });

  const args = ['script.py', safeUrl, safePath, user];
  const pythonProcess = spawn('python3', args, {
    cwd: __dirname,
    detached: true,
    stdio: 'ignore',
  });
  pythonProcess.unref();

  res.status(202).json({ message: 'Téléchargement en arrière-plan lancé.' });
});

// download API
const DOWNLOAD_STATUS_FILE = path.join(__dirname, 'downloads_status.json');

function loadDownloadsFor(user) {
  try {
    if (!fs.existsSync(DOWNLOAD_STATUS_FILE)) return [];
    const raw = fs.readFileSync(DOWNLOAD_STATUS_FILE);
    const allStatus = JSON.parse(raw);
    return allStatus[user] || [];
  } catch (e) {
    console.error(`Erreur lecture statut de téléchargement : ${e}`);
    return [];
  }
}

app.get('/api/downloads', (req, res) => {
  const user = sanitize(req.user || 'anonymous');
  const downloads = loadDownloadsFor(user);
  res.json(downloads);
});

// Debug infos
app.get('/ci', (req, res) => {
  console.log('SUCCESFULLY LOGGED');
  console.log('Client info :', {
    ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
    method: req.method,
    path: req.path,
    fullUrl: req.originalUrl,
    protocol: req.protocol,
    userAgent: req.headers['user-agent'],
    language: req.headers['accept-language'],
    referer: req.headers['referer'] || null,
    cookies: req.cookies,
    query: req.query,
    headers: req.headers,
    body: req.body,
    isSecure: req.secure,
  });
  return res.redirect('/');
});

// Launch server
app.listen(PORT, () => {
  console.log(`🎵 Serveur started on http://localhost:${PORT}`);
});


