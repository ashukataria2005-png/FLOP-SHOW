import { createServer } from '../server.js';
import { config } from '../config/env.js';
import { Server } from 'http';

async function testHttpLogin() {
  const app = createServer();
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });

  const address = server.address() as any;
  const baseUrl = `http://localhost:${address.port}`;
  console.log(`Server running at ${baseUrl}`);

  try {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: config.devAdminEmail,
        password: config.devAdminPassword
      })
    });

    const data: any = await res.json();
    console.log('HTTP Status:', res.status);
    console.log('Response:', data);

    if (res.status === 200 && data.user && data.user.role === 'ADMIN' && data.token) {
      console.log('✓ HTTP Admin login successfully verified!');
    } else {
      console.error('✗ Admin login failed!');
      process.exit(1);
    }
  } finally {
    server.close();
  }
}

testHttpLogin().catch(err => {
  console.error(err);
  process.exit(1);
});
