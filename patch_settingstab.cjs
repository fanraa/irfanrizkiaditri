const fs = require('fs');
let code = fs.readFileSync('src/components/SettingsTab.tsx', 'utf-8');

code = code.replace(
  "import { Settings, Save, Check } from 'lucide-react';",
  "import { Settings, Save, Check } from 'lucide-react';\nimport { auth } from '@/lib/firebase';"
);

code = code.replace(
  "await fetch('/api/admin/settings', {",
  `const token = await auth.currentUser?.getIdToken();
      await fetch('/api/admin/settings', {`
);

code = code.replace(
  "headers: { 'Content-Type': 'application/json' },",
  "headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },"
);

fs.writeFileSync('src/components/SettingsTab.tsx', code);
