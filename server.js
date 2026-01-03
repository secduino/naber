const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Basit in-memory storage (Production'da MongoDB kullanın)
const users = new Map();
const messages = new Map();
const otpStore = new Map();

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'naber-secret-key-change-in-production';

// Nodemailer Transporter
// Nodemailer Transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: 'naber.dogrulama@gmail.com',
    pass: 'hwlj bzle tgin lceh'
  }
});

// OTP Gönder (Telefon)
app.post('/api/auth/send-otp', (req, res) => {
  const { phoneNumber, otp } = req.body;

  // OTP'yi sakla (5 dakika geçerli)
  otpStore.set(phoneNumber, {
    otp,
    expires: Date.now() + 5 * 60 * 1000
  });

  console.log(`OTP sent to ${phoneNumber}: ${otp}`);

  res.json({ success: true, message: 'OTP sent' });
});

// OTP Gönder (Email)
app.post('/api/auth/send-email-otp', async (req, res) => {
  const { email, otp } = req.body;

  otpStore.set(email, {
    otp,
    expires: Date.now() + 5 * 60 * 1000
  });

  const mailOptions = {
    from: '"NAber??? App" <naber.dogrulama@gmail.com>',
    to: email,
    subject: 'NAber??? Doğrulama Kodu',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #075E54;">NAber??? Doğrulama</h2>
        <p>Giriş yapmak için doğrulama kodunuz:</p>
        <h1 style="font-size: 32px; letter-spacing: 5px; color: #128C7E;">${otp}</h1>
        <p>Bu kod 5 dakika boyunca geçerlidir.</p>
        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #888;">Bu kodu siz talep etmediyseniz lütfen dikkate almayınız.</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email OTP sent to ${email}: ${otp}`);
    res.json({ success: true, message: 'OTP email gönderildi' });
  } catch (error) {
    console.error('Email gönderim hatası:', error);
    res.status(500).json({ success: false, message: 'Email gönderilemedi' });
  }
});

// OTP Doğrula
app.post('/api/auth/verify-otp', (req, res) => {
  const { identifier, otp, isPhone } = req.body;

  const storedOTP = otpStore.get(identifier);

  if (!storedOTP) {
    return res.status(400).json({ success: false, message: 'OTP not found' });
  }

  if (Date.now() > storedOTP.expires) {
    otpStore.delete(identifier);
    return res.status(400).json({ success: false, message: 'OTP expired' });
  }

  // OTP doğru mu veya Master OTP (123456) mi?
  if (storedOTP.otp !== otp && otp !== '123456') {
    return res.status(400).json({ success: false, message: 'Invalid OTP' });
  }

  // OTP doğru - kullanıcı oluştur veya getir
  let user = Array.from(users.values()).find(u =>
    isPhone ? u.phoneNumber === identifier : u.email === identifier
  );

  const isNewUser = !user;

  if (!user) {
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    user = {
      id: userId,
      phoneNumber: isPhone ? identifier : '',
      email: !isPhone ? identifier : '',
      name: '',
      createdAt: new Date()
    };
    users.set(userId, user);
  }

  // JWT token oluştur
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });

  otpStore.delete(identifier);

  res.json({
    success: true,
    token,
    userId: user.id,
    isNewUser,
    user: isNewUser ? null : user
  });
});

// Profil Güncelle
app.post('/api/users/profile', authenticateToken, (req, res) => {
  const userId = req.userId;
  const { name, profilePicture, status } = req.body;

  const user = users.get(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  user.name = name || user.name;
  user.profilePicture = profilePicture || user.profilePicture;
  user.status = status || user.status;

  // Telefon ve email bilgilerini de güncelle (ilk kayıt için önemli)
  if (req.body.phoneNumber) user.phoneNumber = req.body.phoneNumber;
  if (req.body.email) user.email = req.body.email;

  users.set(userId, user);

  res.json({ success: true, user });
});

// Online Durum Güncelle
app.post('/api/users/status', authenticateToken, (req, res) => {
  const userId = req.userId;
  const { isOnline } = req.body;

  const user = users.get(userId);
  if (user) {
    user.isOnline = isOnline;
    user.lastSeen = new Date();
    users.set(userId, user);

    // Socket ile broadcast et
    io.emit('user:status', {
      userId,
      isOnline,
      lastSeen: user.lastSeen
    });
  }

  res.json({ success: true });
});

// Kullanıcı Ara (Sadece Tam Eşleşme - WhatsApp mantığı)
app.get('/api/users/search', authenticateToken, (req, res) => {
  const query = req.query.q?.trim() || '';
  const currentUserId = req.userId;

  if (!query) {
    return res.json({ success: true, users: [] });
  }

  // Telefon numarasını temizle (boşluk, parantez vs.)
  const cleanQuery = query.replace(/\D/g, '');

  console.log(`Searching for: ${query} (Clean: ${cleanQuery})`);

  // Tam eşleşme ara (telefon veya email)
  const result = Array.from(users.values()).find(u => {
    // Telefon numarası var mı kontrol et
    const userPhone = u.phoneNumber || '';
    const cleanUserPhone = userPhone.replace(/\D/g, '');

    // Debug
    // console.log(`Checking user ${u.name}: ${cleanUserPhone}`);

    return u.id !== currentUserId && (
      (cleanQuery.length > 5 && cleanUserPhone === cleanQuery) || // En az 5 hane
      (cleanQuery.length > 5 && cleanUserPhone === `90${cleanQuery}`) ||
      (cleanQuery.length > 5 && `90${cleanUserPhone}` === cleanQuery) ||
      (u.email && u.email.toLowerCase() === query.toLowerCase())
    );
  });

  if (result) {
    res.json({ success: true, users: [result] });
  } else {
    res.json({ success: true, users: [] });
  }
});


// JWT Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  // Geliştirme modu token desteği
  if (token.startsWith('dev_token_')) {
    req.userId = token.replace('dev_token_', '');
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid token' });
    }
    req.userId = decoded.userId;
    next();
  });
}

// Socket.IO
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  const userId = socket.handshake.query.userId;

  // Kullanıcıyı online yap
  socket.on('user:online', (data) => {
    let user = users.get(data.userId);

    // Eğer kullanıcı map'te yoksa (server restart olmuş olabilir), yeniden ekle
    if (!user) {
      console.log('User not in map, re-adding:', data.userId);
      user = {
        id: data.userId,
        name: data.name || 'Kullanıcı',
        phoneNumber: data.phoneNumber || '',
        email: data.email || '',
        isOnline: true,
        socketId: socket.id,
        createdAt: new Date()
      };
      users.set(data.userId, user);
    } else {
      user.isOnline = true;
      user.socketId = socket.id;
      // Bilgileri güncelle (eğer eksikse veya değiştiyse)
      if (data.phoneNumber) user.phoneNumber = data.phoneNumber;
      if (data.email) user.email = data.email;
      if (data.name) user.name = data.name;

      users.set(data.userId, user);
    }

    console.log(`User ${data.userId} online. Queryable by: ${user.phoneNumber} or ${user.email}`);

    io.emit('user:status', {
      userId: data.userId,
      isOnline: true
    });
  });

  // Mesaj gönder
  socket.on('message:send', (message) => {
    console.log('Message received:', message);

    // Mesajı sakla
    if (!messages.has(message.chatId)) {
      messages.set(message.chatId, []);
    }
    messages.get(message.chatId).push(message);

    // Alıcıya gönder
    const receiver = users.get(message.receiverId);
    if (receiver && receiver.socketId) {
      io.to(receiver.socketId).emit('message:new', message);
    }

    // Gönderene onay
    socket.emit('message:status', {
      messageId: message.id,
      status: 'delivered'
    });
  });

  // Yazıyor göstergesi
  socket.on('user:typing', (data) => {
    const receiver = users.get(data.receiverId);
    if (receiver && receiver.socketId) {
      io.to(receiver.socketId).emit('user:typing', {
        userId: userId,
        isTyping: data.isTyping
      });
    }
  });

  // Chat okundu
  socket.on('chat:read', (data) => {
    // TODO: Mesaj durumlarını güncelle
  });

  // WebRTC Call Events

  // Arama başlat
  socket.on('call:start', (data) => {
    console.log(`Call start: ${userId} -> ${data.receiverId}`);
    const receiver = users.get(data.receiverId);
    if (receiver && receiver.socketId) {
      console.log(`Forwarding call to socket ${receiver.socketId}`);
      io.to(receiver.socketId).emit('call:incoming', {
        callerId: userId,
        type: data.type
      });
    } else {
      console.log(`Receiver ${data.receiverId} not found or offline`);
    }
  });

  // Aramayı kabul et
  socket.on('call:accept', (data) => {
    const caller = users.get(data.callerId);
    if (caller && caller.socketId) {
      io.to(caller.socketId).emit('call:accepted', {
        receiverId: userId
      });
    }
  });

  // Aramayı reddet
  socket.on('call:reject', (data) => {
    const caller = users.get(data.callerId);
    if (caller && caller.socketId) {
      io.to(caller.socketId).emit('call:rejected', {
        receiverId: userId
      });
    }
  });

  // Aramayı sonlandır
  socket.on('call:end', (data) => {
    const otherUser = users.get(data.userId);
    if (otherUser && otherUser.socketId) {
      io.to(otherUser.socketId).emit('call:ended', {
        userId: userId
      });
    }
  });

  // WebRTC Offer
  socket.on('webrtc:offer', (data) => {
    console.log(`WebRTC Offer from ${userId} to ${data.userId}`);
    const receiver = users.get(data.userId);
    if (receiver && receiver.socketId) {
      io.to(receiver.socketId).emit('webrtc:offer', {
        userId: userId,
        offer: data.offer
      });
    }
  });

  // WebRTC Answer
  socket.on('webrtc:answer', (data) => {
    const caller = users.get(data.userId);
    if (caller && caller.socketId) {
      io.to(caller.socketId).emit('webrtc:answer', {
        userId: userId,
        answer: data.answer
      });
    }
  });

  // ICE Candidate
  socket.on('webrtc:ice-candidate', (data) => {
    const otherUser = users.get(data.userId);
    if (otherUser && otherUser.socketId) {
      io.to(otherUser.socketId).emit('webrtc:ice-candidate', {
        userId: userId,
        candidate: data.candidate
      });
    }
  });

  // Bağlantı kesildiğinde
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);

    // Kullanıcıyı offline yap
    if (userId) {
      const user = users.get(userId);
      if (user) {
        user.isOnline = false;
        user.lastSeen = new Date();
        users.set(userId, user);

        io.emit('user:status', {
          userId,
          isOnline: false,
          lastSeen: user.lastSeen
        });
      }
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', users: users.size, messages: messages.size });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 NAber??? Server running on port ${PORT}`);
  console.log(`📱 Socket.IO ready for connections`);
});
