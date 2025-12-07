const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());

// port ve admin şifresi
const PORT = 4000;
const ADMIN_SECRET = "changeme";

// burada tüm entry’ler tutuluyor
let entries = [];

// socket bağlantısı
io.on('connection', (socket) => {
  console.log("client connected:", socket.id);

  // bağlanana tüm entry listesini gönder
  socket.emit("entry:list", entries);

  socket.on("disconnect", () => {
    console.log("client disconnected:", socket.id);
  });
});

// tweet url kontrol
function isValidTweetUrl(url) {
  return /\/status\/\d+/.test(url);
}

// API — entry gönderme
app.post("/api/submit", (req, res) => {
  const { url, user } = req.body;

  if (!url || !user) {
    return res.status(400).json({ error: "url and user required" });
  }

  if (!user.startsWith("@")) {
    return res.status(400).json({ error: "username must start with @" });
  }

  if (!isValidTweetUrl(url)) {
    return res.status(400).json({ error: "invalid tweet url" });
  }

  // basit verification
  let verified = "no";
  if (/\$PIPI/i.test(url) || /pipi/i.test(url)) {
    verified = "yes";
  }

  const entry = {
    id: Date.now(),
    url,
    user,
    verified
  };

  entries.push(entry);

  io.emit("entry:add", entry);

  return res.json({ ok: true, entry });
});

// API — winner seçme (admin)
app.post("/api/pick-winner", (req, res) => {
  const secret = req.headers["x-admin-secret"];

  if (secret !== ADMIN_SECRET) {
    return res.status(401).json({ error: "invalid admin secret" });
  }

  if (entries.length === 0) {
    return res.status(400).json({ error: "no entries" });
  }

  const pool = entries.filter(e => e.verified === "yes");
  const listToUse = pool.length > 0 ? pool : entries;

  const winner = listToUse[Math.floor(Math.random() * listToUse.length)];

  io.emit("winner", winner);

  return res.json({ ok: true, winner });
});

// basit index
app.get("/", (req, res) => {
  res.send("PiPi backend working 🐸");
});

server.listen(PORT, () => {
  console.log("Backend running on port", PORT);
});
