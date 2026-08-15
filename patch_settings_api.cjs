const fs = require('fs');
let code = fs.readFileSync('api/admin/settings.ts', 'utf-8');

code = code.replace(
  "const snap = await fetch(`${URL}?updateMask.fieldPaths=geminiApiKey`, {",
  `const authHeader = req.headers.authorization || '';
      const snap = await fetch(\`\${URL}?updateMask.fieldPaths=geminiApiKey\`, {`
);

code = code.replace(
  "headers: { 'Content-Type': 'application/json' },",
  "headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },"
);

fs.writeFileSync('api/admin/settings.ts', code);
