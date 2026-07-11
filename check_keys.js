import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) { console.error("❌ .env not found"); return {}; }
  const vars = {};
  fs.readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const parts = trimmed.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      let value = parts.slice(1).join('=').trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
        value = value.substring(1, value.length - 1);
      vars[key] = value;
    }
  });
  return vars;
}

const env = parseEnv();
const url = env.SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const currentAnonKey = env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log("=".repeat(60));
console.log("SUPABASE KEY DIAGNOSTICS");
console.log("=".repeat(60));
console.log("\nCurrent publishable key:", currentAnonKey);
console.log("Key starts with 'eyJ'?", currentAnonKey?.startsWith('eyJ') ? "YES ✅ (standard JWT)" : "NO ❌ (non-standard format)");

if (currentAnonKey?.startsWith('sb_publishable_')) {
  console.log("\n⚠️  You are using a 'sb_publishable_' key format.");
  console.log("   This is a newer Supabase key format that may NOT work with");
  console.log("   supabase-js v2 auth methods like getSession(), signIn, signUp.");
  console.log("   Data queries (select/insert) work, but auth hangs.\n");
}

// Try to use service role client to decode what the JWT anon key should be
// The ref is embedded in the service role JWT
const servicePayload = JSON.parse(Buffer.from(serviceKey.split('.')[1], 'base64').toString());
console.log("Service role JWT payload:", servicePayload);
console.log("Project ref from JWT:", servicePayload.ref);

console.log("\n" + "=".repeat(60));
console.log("HOW TO FIX");
console.log("=".repeat(60));
console.log(`
1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/${servicePayload.ref}/settings/api
2. Under "Project API Keys", find the key labeled "anon" / "public"
3. It should be a long JWT starting with "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
4. Copy it and replace your .env values:

   SUPABASE_PUBLISHABLE_KEY="<paste the anon JWT key here>"
   VITE_SUPABASE_PUBLISHABLE_KEY="<paste the anon JWT key here>"

5. Restart the dev server (npm run dev)
6. The admin dashboard should now load correctly.
`);
