import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Simple parser for .env files since dotenv might not be installed
function parseEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    console.error("❌ .env file not found. Make sure .env exists in the project root.");
    return {};
  }
  const content = fs.readFileSync(envPath, 'utf8');
  const vars = {};
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const parts = trimmed.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      let value = parts.slice(1).join('=').trim();
      // Remove surrounding quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1);
      }
      vars[key] = value;
    }
  });
  return vars;
}

const env = parseEnv();
const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const key = env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log("=================================================");
console.log("MOTOHELM CONNECTION VERIFICATION");
console.log("=================================================");
console.log("Configured Target URL :", url || "Not Found");
console.log("Configured Publish Key:", key ? `${key.substring(0, 15)}...` : "Not Found");
console.log("=================================================");

if (!url || !key) {
  console.error("❌ Missing Supabase URL or Publishable Key in .env file.");
  process.exit(1);
}

const supabase = createClient(url, key);

async function testConnection() {
  try {
    // 1. Test public access read on settings table
    const { data: settings, error: sErr } = await supabase
      .from('settings')
      .select('store_name, currency, currency_symbol')
      .limit(1)
      .maybeSingle();

    if (sErr) {
      console.error("❌ Failed to query 'settings' table:", sErr.message);
    } else {
      console.log("✅ SUCCESS: Successfully fetched store config settings!");
      console.log(`   Store Name     : ${settings?.store_name ?? '—'}`);
      console.log(`   Currency Symbol: ${settings?.currency_symbol ?? '—'} (${settings?.currency ?? '—'})`);
    }

    // 2. Test public access read on categories
    const { data: categories, error: cErr } = await supabase
      .from('categories')
      .select('name')
      .limit(3);

    if (cErr) {
      console.error("❌ Failed to query 'categories' table:", cErr.message);
    } else {
      console.log("✅ SUCCESS: Successfully fetched store categories!");
      const names = (categories ?? []).map(c => c.name).join(', ');
      console.log(`   Categories     : ${names || 'None'}`);
    }

    // 3. Test public access read on products
    const { data: products, error: pErr } = await supabase
      .from('products')
      .select('name')
      .limit(3);

    if (pErr) {
      console.error("❌ Failed to query 'products' table:", pErr.message);
    } else {
      console.log("✅ SUCCESS: Successfully fetched storefront product records!");
      const names = (products ?? []).map(p => p.name).join(', ');
      console.log(`   Sample Products: ${names || 'None'}`);
    }

  } catch (err) {
    console.error("❌ Network or client initialization error:", err.message);
  }
}

testConnection();
