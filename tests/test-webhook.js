const http = require('http');

const payload = JSON.stringify({
  event: 'messages.upsert',
  instance: 'clinikzap',
  data: {
    key: {
      remoteJid: '5511999999999@s.whatsapp.net',
      fromMe: false,
      id: 'TEST_MSG_ID_12345'
    },
    pushName: 'Paciente de Teste',
    message: {
      conversation: 'Olá! Gostaria de agendar uma consulta.'
    },
    messageType: 'conversation'
  }
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/webhook/whatsapp',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('--- Resposta do Webhook ---');
    console.log(`Status: ${res.statusCode}`);
    console.log(`Corpo: ${data}`);
  });
});

req.on('error', (e) => {
  console.error(`Erro ao disparar requisição: ${e.message}`);
  console.log('\n--> Certifique-se de que o servidor Next.js está rodando (npm run dev) na porta 3000!');
});

req.write(payload);
req.end();
