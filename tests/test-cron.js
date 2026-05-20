const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/cron/send-reminders',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('--- Resposta do Cron ---');
    console.log(`Status: ${res.statusCode}`);
    console.log(`Corpo: ${data}`);
  });
});

req.on('error', (e) => {
  console.error(`Erro ao disparar requisição: ${e.message}`);
  console.log('\n--> Certifique-se de que o servidor Next.js está rodando (npm run dev) na porta 3000!');
});

req.end();
