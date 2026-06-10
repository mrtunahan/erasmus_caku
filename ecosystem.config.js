module.exports = {
  apps: [{
    name: 'erasmus_caku',
    script: './server/index.js',
    cwd: '/var/www/erasmus_caku',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      MONGODB_URI: 'mongodb://127.0.0.1:27017/erasmus_caku',
      ALLOWED_ORIGINS: 'https://offlineasistan.com.tr,https://www.offlineasistan.com.tr',
      JWT_EXPIRES_IN: '24h'
      // JWT_SECRET BİLEREK BURADA DEĞİL — gizli anahtar git'e commit'lenmemeli.
      // server/.env (gitignore'lu) dosyasından dotenv ile yüklenir.
      // Sunucuda kurulum:
      //   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
      //   → çıktıyı server/.env içine  JWT_SECRET=...  olarak yaz.
    }
  }]
}
