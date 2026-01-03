# NAber??? Backend - Render Deployment

Bu backend Render.com'da ücretsiz olarak çalışır.

## 🚀 Render'a Deploy

### Otomatik Deploy (Önerilen)

1. **GitHub'a Push Edin**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/naber-backend.git
   git push -u origin main
   ```

2. **Render.com'a Gidin**
   - [render.com](https://render.com) hesabı oluşturun
   - "New +" → "Web Service"
   - GitHub repository'nizi bağlayın
   - `backend` klasörünü seçin

3. **Ayarlar**
   - **Name**: `naber-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`

4. **Environment Variables**
   ```
   PORT=3000
   JWT_SECRET=your-super-secret-jwt-key-here
   NODE_ENV=production
   ```

5. **Deploy** butonuna tıklayın!

### Manuel Deploy

```bash
# Render CLI yükle
npm install -g render-cli

# Login
render login

# Deploy
render deploy
```

## 🌐 URL

Deploy sonrası URL'iniz:
```
https://naber-backend.onrender.com
```

Bu URL'i Flutter uygulamasında kullanın:
```dart
// lib/config/api_config.dart
static const String baseUrl = 'https://naber-backend.onrender.com';
static const String socketUrl = 'https://naber-backend.onrender.com';
```

## ⚠️ Önemli Notlar

### Ücretsiz Plan Limitleri
- ✅ 750 saat/ay çalışma süresi
- ✅ Otomatik SSL sertifikası
- ⚠️ 15 dakika inaktivite sonrası uyku modu
- ⚠️ İlk istek 30-60 saniye sürebilir (cold start)

### Cold Start Çözümü
Render'ın ücretsiz planında servis 15 dakika kullanılmazsa uyur. Çözüm:

1. **Cron Job** (Önerilen):
   - [cron-job.org](https://cron-job.org) ücretsiz hesap
   - Her 10 dakikada bir `/health` endpoint'ine istek
   - URL: `https://naber-backend.onrender.com/health`

2. **UptimeRobot**:
   - [uptimerobot.com](https://uptimerobot.com) ücretsiz
   - 5 dakikada bir ping

## 🔒 Güvenlik

Production için:
1. Güçlü JWT secret kullanın
2. CORS ayarlarını düzenleyin
3. Rate limiting ekleyin
4. MongoDB Atlas kullanın (ücretsiz 512MB)

## 📊 MongoDB Atlas (Ücretsiz Database)

1. [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) hesap
2. Free Cluster oluştur (512MB)
3. Database user oluştur
4. IP whitelist: `0.0.0.0/0` (herkese açık)
5. Connection string al
6. Render'da environment variable ekle:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/naber
   ```

## 🔄 Auto-Deploy

GitHub'a her push'ta otomatik deploy:
- Render otomatik algılar
- `main` branch'e push = otomatik deploy
- Build logları Render dashboard'da

## 📝 Logs

Render dashboard'da:
- Real-time logs
- Error tracking
- Performance metrics

## 💰 Maliyet

**Tamamen Ücretsiz!**
- Render: Free tier
- MongoDB Atlas: Free tier (512MB)
- GitHub: Free
- SSL: Otomatik ücretsiz

## 🎯 Sonraki Adımlar

1. Backend'i deploy edin
2. URL'i Flutter'da güncelleyin
3. Test edin
4. MongoDB ekleyin (opsiyonel)
5. Cron job kurun (cold start için)
