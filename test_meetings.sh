#!/bin/bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjdmZjZiNDIxLTgxNjAtNGRlYS1hYTJlLWZlMGI0NDE5ZWUwYyIsImVtYWlsIjoiYWRtaW5AYWNtZS5jb20iLCJvcmdhbml6YXRpb25JZCI6ImQzYmY4MGRmLWZhZTktNGUyOS1iNWVhLTY3NmJmNGVjMmY5NiIsInJvbGUiOiJhZG1pbiIsInNlc3Npb25JZCI6ImRhMmY5YTE0LWZkMDItNDg1Mi1hZTdjLTRmMWY5NzYxOGM0NCIsImlhdCI6MTc2NTQyMjUyOCwiZXhwIjoxNzY1NDI2MTI4fQ.DRw1kdPNdI_fmrj0EYALpt43pI3hhLtCG8vAY6jE_7k"

echo "=== Testing /api/meetings with admin auth ==="
curl -s -i "http://localhost:4100/api/meetings"   -H "Authorization: Bearer $TOKEN"   -H "Content-Type: application/json"
