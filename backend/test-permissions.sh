#!/bin/bash
echo "1. Logging in as Super Admin..."
RES=$(curl -s -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"email":"super@example.com","password":"SuperPass123!"}')
SUPER_TOKEN=$(echo $RES | node -pe "require('fs').readFileSync(0).toString().includes('token') ? JSON.parse(require('fs').readFileSync(0)).token : ''" )
echo "SuperToken: $SUPER_TOKEN"

echo -e "\n2. Super Admin fetching users (Admins):"
curl -s http://localhost:5000/api/admin/users -H "Authorization: Bearer $SUPER_TOKEN" | node -pe "JSON.stringify(JSON.parse(require('fs').readFileSync(0)), null, 2)" || echo "failed"

echo -e "\n3. Super Admin creating a new Admin:"
curl -s -X POST http://localhost:5000/api/admin/users -H "Authorization: Bearer $SUPER_TOKEN" -H "Content-Type: application/json" -d '{"name":"Second Admin", "email":"admin2@example.com", "password":"Admin2Pass123!", "role":"admin"}' | node -pe "JSON.stringify(JSON.parse(require('fs').readFileSync(0)), null, 2)" || echo "failed"

echo -e "\n4. Logging in as original Admin..."
RES2=$(curl -s -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@example.com","password":"AdminPass123!"}')
ADMIN_TOKEN=$(echo $RES2 | node -pe "require('fs').readFileSync(0).toString().includes('token') ? JSON.parse(require('fs').readFileSync(0)).token : ''")
echo "AdminToken: $ADMIN_TOKEN"

echo -e "\n5. Admin fetching users (Clients):"
curl -s http://localhost:5000/api/admin/users -H "Authorization: Bearer $ADMIN_TOKEN" | node -pe "JSON.stringify(JSON.parse(require('fs').readFileSync(0)), null, 2)" || echo "failed"

echo -e "\n6. Admin creating a new User (Client):"
curl -s -X POST http://localhost:5000/api/admin/users -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -d '{"name":"Client User", "email":"client@example.com", "password":"ClientPass123!"}' | node -pe "JSON.stringify(JSON.parse(require('fs').readFileSync(0)), null, 2)" || echo "failed"

