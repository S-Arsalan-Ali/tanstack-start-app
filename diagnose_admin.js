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
const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log("=".repeat(60));
console.log("ADMIN ACCESS DIAGNOSTICS");
console.log("=".repeat(60));

if (!url || !serviceKey) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

// Use service_role key to bypass all RLS
const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function diagnose() {
  // Step 1: Check if user_roles table exists
  console.log("\n🔍 Step 1: Checking if user_roles table exists...");
  const { data: tableCheck, error: tableErr } = await admin
    .from('user_roles')
    .select('id', { count: 'exact', head: true });

  if (tableErr) {
    console.error("❌ user_roles table error:", tableErr.message);
    console.error("   → You may need to run the supabase_master_setup.sql first!");
    return;
  }
  console.log("✅ user_roles table exists. Total rows:", tableCheck);

  // Step 2: List all auth users
  console.log("\n🔍 Step 2: Listing registered auth users...");
  const { data: usersResp, error: usersErr } = await admin.auth.admin.listUsers();
  
  if (usersErr) {
    console.error("❌ Failed to list auth users:", usersErr.message);
    return;
  }

  const users = usersResp?.users ?? [];
  if (users.length === 0) {
    console.log("⚠️  No users registered yet! Sign up first at /signup");
    return;
  }

  console.log(`✅ Found ${users.length} registered user(s):`);
  users.forEach((u, i) => {
    console.log(`   ${i + 1}. ${u.email} (ID: ${u.id}) — Created: ${u.created_at}`);
  });

  // Step 3: Check user_roles for each user
  console.log("\n🔍 Step 3: Checking user_roles assignments...");
  const { data: allRoles, error: rolesErr } = await admin
    .from('user_roles')
    .select('user_id, role');

  if (rolesErr) {
    console.error("❌ Failed to query user_roles:", rolesErr.message);
    return;
  }

  if (!allRoles || allRoles.length === 0) {
    console.log("⚠️  user_roles table is EMPTY — no roles assigned to anyone!");
    console.log("   → This is likely why the admin dashboard is stuck on the loader.");
    console.log("   → The signup trigger (handle_new_user) may not have fired.");
  } else {
    console.log(`✅ Found ${allRoles.length} role assignment(s):`);
    allRoles.forEach((r) => {
      const user = users.find((u) => u.id === r.user_id);
      console.log(`   • ${user?.email ?? r.user_id} → ${r.role}`);
    });
  }

  // Step 4: Check if any user has admin role
  const adminRoles = (allRoles ?? []).filter((r) => r.role === 'admin');
  if (adminRoles.length > 0) {
    console.log("\n✅ Admin user(s) already exist:");
    adminRoles.forEach((r) => {
      const user = users.find((u) => u.id === r.user_id);
      console.log(`   • ${user?.email ?? r.user_id}`);
    });
    console.log("\n💡 If you're logged in as one of these emails, the dashboard should open.");
    console.log("   Check browser console (F12) for more detailed [AdminGate] logs.");
  } else {
    // Step 5: Auto-fix — promote the first user to admin
    const firstUser = users[0];
    console.log(`\n⚠️  No admin users found. Promoting first user to admin...`);
    console.log(`   Email: ${firstUser.email}`);
    console.log(`   ID:    ${firstUser.id}`);
    
    const { error: insertErr } = await admin
      .from('user_roles')
      .upsert({ user_id: firstUser.id, role: 'admin' }, { onConflict: 'user_id,role' });

    if (insertErr) {
      console.error("❌ Failed to promote user:", insertErr.message);
      console.log("\n📋 Run this SQL manually in your Supabase SQL Editor:");
      console.log(`INSERT INTO public.user_roles (user_id, role) VALUES ('${firstUser.id}', 'admin') ON CONFLICT DO NOTHING;`);
    } else {
      console.log("✅ SUCCESS! User promoted to admin.");
      console.log("   → Reload the admin dashboard in your browser now.");
    }
  }

  // Step 6: Check profiles table
  console.log("\n🔍 Step 6: Checking profiles table...");
  const { data: profiles, error: profErr } = await admin
    .from('profiles')
    .select('user_id, name, email');

  if (profErr) {
    console.error("❌ profiles table error:", profErr.message);
  } else if (!profiles || profiles.length === 0) {
    console.log("⚠️  profiles table is EMPTY — the signup trigger may not have run.");
    console.log("   → This means the handle_new_user() trigger was not created in the database.");
    console.log("   → Please run the supabase_master_setup.sql in the Supabase SQL Editor.");
  } else {
    console.log(`✅ Found ${profiles.length} profile(s):`);
    profiles.forEach((p) => console.log(`   • ${p.email} (${p.name ?? 'No name'})`));
  }

  console.log("\n" + "=".repeat(60));
  console.log("DIAGNOSIS COMPLETE");
  console.log("=".repeat(60));
}

diagnose().catch((err) => {
  console.error("❌ Diagnostic script failed:", err.message);
});
