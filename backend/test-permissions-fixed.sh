#!/bin/bash
RES=$(curl -s -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"email":"super@example.com","password":"SuperPass123!"}')
SUPER_TOKEN=$(echo $RES | node -pe "JSON.parse(require('fs').readFileSync(0)).token")

echo "1. Super Admin fetching users (Admins):"
curl -s http://localhost:5000/api/admin/users -H "Authorization: Bearer $SUPER_TOKEN" | node -pe "JSON.stringify(JSON.parse(require('fs').readFileSync(0)), null, 2)"

echo -e "\n2. Super Admin creating a new Admin:"
curl -s -X POST http://localhost:5000/api/admin/users -H "Authorization: Bearer $SUPER_TOKEN" -H "Content-Type: application/json" -d '{"name":"Second Admin", "email":"admin22@example.com", "password":"Admin2Pass123!", "role":"admin"}' | node -pe "JSON.stringify(JSON.parse(require('fs').readFileSync(0)), null, 2)"

RES2=$(curl -s -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@example.com","password":"AdminPass123!"}')
ADMIN_TOKEN=$(echo $RES2 | node -pe "JSON.parse(require('fs').readFileSync(0)).token")

echo -e "\n3. Admin fetching users (Clients):"
curl -s http://localhost:5000/api/admin/users -H "Authorization: Bearer $ADMIN_TOKEN" | node -pe "JSON.stringify(JSON.parse(require('fs').readFileSync(0)), null, 2)"

echo -e "\n4. Admin creating a new User (Client):"
curl -s -X POST http://localhost:5000/api/admin/users -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -d '{"name":"Client User", "email":"client11@example.com", "password":"ClientPass123!"}' | node -pe "JSON.stringify(JSON.parse(require('fs').readFileSync(0)), null, 2)"
