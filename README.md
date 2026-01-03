# NAber??? Backend Server

Node.js + Socket.IO tabanlı mesajlaşma backend'i.

## 🚀 Kurulum

### 1. Bağımlılıkları Yükle

```bash
npm install
```

### 2. Ortam Değişkenleri

`.env` dosyası oluşturun:

```env
PORT=3000
JWT_SECRET=your-super-secret-jwt-key-change-this
NODE_ENV=development
```

### 3. Sunucuyu Başlat

```bash
# Production
npm start

# Development (auto-reload)
npm run dev
```

## 📡 API Endpoints

### Authentication

#### POST `/api/auth/send-otp`
Telefon numarasına OTP gönder

```json
{
  "phoneNumber": "+905551234567",
  "otp": "123456"
}
```

#### POST `/api/auth/send-email-otp`
Email'e OTP gönder

```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

#### POST `/api/auth/verify-otp`
OTP doğrula ve token al

```json
{
  "identifier": "+905551234567",
  "otp": "123456",
  "isPhone": true
}
```

Response:
```json
{
  "success": true,
  "token": "jwt-token-here",
  "userId": "user_id",
  "isNewUser": false,
  "user": { ... }
}
```

### Users

#### POST `/api/users/profile`
Profil güncelle (Auth gerekli)

Headers:
```
Authorization: Bearer <token>
```

Body:
```json
{
  "name": "John Doe",
  "profilePicture": "url",
  "status": "Hey there!"
}
```

#### POST `/api/users/status`
Online durumu güncelle (Auth gerekli)

```json
{
  "isOnline": true
}
```

## 🔌 Socket.IO Events

### Client → Server

#### `user:online`
Kullanıcı online oldu

```javascript
socket.emit('user:online', { userId: 'user_id' });
```

#### `message:send`
Mesaj gönder

```javascript
socket.emit('message:send', {
  id: 'msg_id',
  senderId: 'user_id',
  receiverId: 'other_user_id',
  chatId: 'chat_id',
  content: 'Hello!',
  type: 'text',
  timestamp: '2026-01-03T...'
});
```

#### `user:typing`
Yazıyor göstergesi

```javascript
socket.emit('user:typing', {
  receiverId: 'user_id',
  isTyping: true
});
```

### Server → Client

#### `message:new`
Yeni mesaj alındı

```javascript
socket.on('message:new', (message) => {
  console.log('New message:', message);
});
```

#### `message:status`
Mesaj durumu güncellendi

```javascript
socket.on('message:status', (data) => {
  console.log('Message status:', data);
});
```

#### `user:status`
Kullanıcı durumu değişti

```javascript
socket.on('user:status', (data) => {
  console.log('User status:', data);
});
```

## 🔐 Güvenlik

### Production için öneriler:

1. **JWT Secret**: Güçlü bir secret key kullanın
2. **HTTPS**: SSL sertifikası ekleyin
3. **Rate Limiting**: Express rate limiter ekleyin
4. **MongoDB**: In-memory storage yerine MongoDB kullanın
5. **Validation**: Input validation ekleyin (joi, express-validator)
6. **Helmet**: Security headers için helmet middleware
7. **CORS**: Production'da sadece belirli origin'lere izin verin

## 📊 Veritabanı

Şu anda basit in-memory storage kullanılıyor. Production için MongoDB önerilir:

```javascript
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
```

## 🐳 Docker (Opsiyonel)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 📝 Notlar

- OTP'ler 5 dakika geçerlidir
- JWT token'lar 30 gün geçerlidir
- Socket.IO CORS tüm origin'lere açık (production'da değiştirin)
- Mesajlar in-memory'de saklanıyor (yeniden başlatmada silinir)

## 🚀 Deploy

### Heroku

```bash
heroku create naber-backend
git push heroku main
```

### VPS (Ubuntu)

```bash
# PM2 ile çalıştır
npm install -g pm2
pm2 start server.js --name naber-backend
pm2 save
pm2 startup
```

## 📞 Destek

Sorularınız için GitHub Issues kullanabilirsiniz.
