import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseEnv() {
  const envPath = path.join(__dirname, '.env');
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
const anonKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY;

console.log("=".repeat(60));
console.log("AUTH TEST WITH NEW ANON KEY");
console.log("=".repeat(60));
console.log("URL:", url);
console.log("Key starts with eyJ:", anonKey?.startsWith('eyJ'));
console.log("Key length:", anonKey?.length);

const supabase = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function testAuth() {
  // Test 1: getSession (should return null since this is Node, not browser)
  console.log("\n🔍 Test 1: supabase.auth.getSession()...");
  const start1 = Date.now();
  try {
    const { data, error } = await supabase.auth.getSession();
    const elapsed = Date.now() - start1;
    console.log(`   Completed in ${elapsed}ms`);
    if (error) {
      console.log("   ❌ Error:", error.message);
    } else {
      console.log("   ✅ Result: session =", data.session ? "exists" : "null (expected in Node)");
    }
  } catch (err) {
    console.log("   ❌ Exception:", err.message);
  }

  // Test 2: signInWithPassword
  console.log("\n🔍 Test 2: supabase.auth.signInWithPassword()...");
  const start2 = Date.now();
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'codinnnggg@gmail.com',
      password: 'test_wrong_password_12345'
    });
    const elapsed = Date.now() - start2;
    console.log(`   Completed in ${elapsed}ms`);
    if (error) {
      console.log("   ✅ Got expected error (wrong password):", error.message);
      console.log("   → This proves auth API is REACHABLE and WORKING!");
    } else {
      console.log("   Unexpected success (shouldn't happen with wrong password)");
    }
  } catch (err) {
    console.log("   ❌ Exception (auth API unreachable?):", err.message);
  }

  // Test 3: Data query with anon key
  console.log("\n🔍 Test 3: Data query (settings table)...");
  const start3 = Date.now();
  try {
    const { data, error } = await supabase.from('settings').select('store_name').maybeSingle();
    const elapsed = Date.now() - start3;
    console.log(`   Completed in ${elapsed}ms`);
    if (error) {
      console.log("   ❌ Error:", error.message);
    } else {
      console.log("   ✅ Store:", data?.store_name);
    }
  } catch (err) {
    console.log("   ❌ Exception:", err.message);
  }

  // Test 4: user_roles query with anon key (should fail without auth)
  console.log("\n🔍 Test 4: user_roles query (no auth, should be empty/denied)...");
  const start4 = Date.now();
  try {
    const { data, error } = await supabase.from('user_roles').select('role').limit(5);
    const elapsed = Date.now() - start4;
    console.log(`   Completed in ${elapsed}ms`);
    if (error) {
      console.log("   Result (error):", error.message, "— code:", error.code);
    } else {
      console.log("   Result:", data?.length ?? 0, "rows returned (expected 0 without auth)");
    }
  } catch (err) {
    console.log("   ❌ Exception:", err.message);
  }

  console.log("\n" + "=".repeat(60));
  console.log("CONCLUSION");
  console.log("=".repeat(60));
  console.log(`
If Test 1 & 2 completed quickly → the new anon key is working.
The browser issue is likely:
  • You need to CLEAR your old session (sign out and sign in again)
  • Or clear localStorage in the browser (F12 → Application → Local Storage → Clear)

After clearing, go to /login, sign in, then go to /admin.
`);
}

testAuth();
