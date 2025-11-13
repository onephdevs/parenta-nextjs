#!/usr/bin/env node

/**
 * Database Initialization Script for Parenta
 * Run this on the server after first deployment
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function initializeDatabase() {
  log('🚀 Parenta Database Initialization', 'blue');
  log('====================================\n', 'blue');

  // Check if DATABASE_URL is set
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    log('❌ ERROR: DATABASE_URL environment variable not set', 'red');
    log('\nPlease set it in your .env.production file:', 'yellow');
    log('DATABASE_URL="postgresql://parenta_user:Parenta2025!!@localhost:5432/parenta_db"', 'yellow');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: false // No SSL for localhost
  });

  try {
    // Test connection
    log('📡 Testing database connection...', 'blue');
    await pool.query('SELECT NOW()');
    log('✅ Database connection successful\n', 'green');

    // Read schema file
    log('📖 Reading database schema...', 'blue');
    const schemaPath = path.join(__dirname, '../src/lib/schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      log(`❌ ERROR: Schema file not found at ${schemaPath}`, 'red');
      process.exit(1);
    }

    const schema = fs.readFileSync(schemaPath, 'utf8');
    log('✅ Schema file loaded\n', 'green');

    // Execute schema
    log('🔧 Creating database tables...', 'blue');
    log('This may take a minute...\n', 'yellow');
    
    await pool.query(schema);
    
    log('✅ Database schema created successfully!\n', 'green');

    // Verify tables were created
    log('🔍 Verifying table creation...', 'blue');
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    log(`✅ Found ${result.rows.length} tables:\n`, 'green');
    result.rows.forEach(row => {
      log(`   - ${row.table_name}`, 'green');
    });

    // Check for essential tables
    const essentialTables = [
      'users',
      'buildings',
      'rooms',
      'tenants',
      'payments',
      'invoices'
    ];

    log('\n🔍 Checking essential tables...', 'blue');
    const tableNames = result.rows.map(row => row.table_name);
    let allPresent = true;

    essentialTables.forEach(table => {
      if (tableNames.includes(table)) {
        log(`   ✅ ${table}`, 'green');
      } else {
        log(`   ❌ ${table} - MISSING!`, 'red');
        allPresent = false;
      }
    });

    if (allPresent) {
      log('\n🎉 Database initialization complete!', 'green');
      log('====================================\n', 'green');
      log('Next steps:', 'blue');
      log('1. Create your admin account at: http://YOUR_IP:3030/auth/signup', 'yellow');
      log('2. Login and start using the application', 'yellow');
      log('3. Create your first building and rooms\n', 'yellow');
    } else {
      log('\n⚠️  Warning: Some tables are missing!', 'yellow');
      log('Please check the schema.sql file and try again.\n', 'yellow');
    }

  } catch (error) {
    log('\n❌ Database initialization failed!', 'red');
    log('====================================\n', 'red');
    
    if (error.code === 'ECONNREFUSED') {
      log('PostgreSQL connection refused. Please check:', 'yellow');
      log('1. PostgreSQL is running: sudo systemctl status postgresql', 'yellow');
      log('2. Database exists: psql -U postgres -c "\\l"', 'yellow');
      log('3. DATABASE_URL is correct in .env.production\n', 'yellow');
    } else if (error.code === '28P01') {
      log('Authentication failed. Please check:', 'yellow');
      log('1. Database user exists', 'yellow');
      log('2. Password is correct in DATABASE_URL', 'yellow');
      log('3. User has proper permissions\n', 'yellow');
    } else {
      log('Error details:', 'yellow');
      console.error(error);
      log('\n', 'reset');
    }

    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  initializeDatabase()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { initializeDatabase };

