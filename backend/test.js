const http = require('http');

const request = (options, data) => new Promise((resolve, reject) => {
  const req = http.request(options, res => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body || '{}') }));
  });
  req.on('error', reject);
  if (data) req.write(JSON.stringify(data));
  req.end();
});

async function main() {
  console.log("1. SuperAdmin Login");
  let res = await request({ method: 'POST', host: 'localhost', port: 5000, path: '/api/auth/login', headers: { 'Content-Type': 'application/json' } }, 
    { email: "super@example.com", password: "SuperPass123!" });
  const superToken = res.body.token;
  console.log(res.status === 200 ? "Success" : "Failed", superToken ? "Got Token" : "No Token");

  console.log("2. SuperAdmin Create Admin");
  res = await request({ method: 'POST', host: 'localhost', port: 5000, path: '/api/admin/users', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${superToken}` } }, 
    { name: "My Admin", email: "myadmin@example.com", password: "Pass", role: "admin" });
  console.log(res.status === 201 ? "Success" : "Failed", res.body);

  console.log("3. Admin Login");
  res = await request({ method: 'POST', host: 'localhost', port: 5000, path: '/api/auth/login', headers: { 'Content-Type': 'application/json' } }, 
    { email: "myadmin@example.com", password: "Pass" });
  const adminToken = res.body.token;
  console.log(res.status === 200 ? "Success" : "Failed", adminToken ? "Got Token" : "No Token");

  console.log("4. Admin Create User");
  res = await request({ method: 'POST', host: 'localhost', port: 5000, path: '/api/admin/users', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` } }, 
    { name: "My User", email: "myuser@example.com", password: "Pass" });
  console.log(res.status === 201 ? "Success" : "Failed", res.body);
}

main();
