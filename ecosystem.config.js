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
      JWT_EXPIRES_IN: '24h',
      JWT_SECRET: 'abcee1c8a3dcbca621acc63ef333f1639384077916bed8ffcd1bd6174d08e4ce5690f001d43fee639704efc40f0e7fd629355bec4bdcd243e095bd8591cc47e5'
    }
  }]
}
