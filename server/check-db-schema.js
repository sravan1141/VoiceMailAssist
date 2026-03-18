const Database = require('better-sqlite3');
const path = require('path');

// Connect to the database
const db = new Database(path.join(__dirname, 'data', 'app.db'));

console.log('=== DATABASE SCHEMA ANALYSIS ===\n');

// Get all table names
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables in database:');
tables.forEach(table => {
    console.log(`  - ${table.name}`);
});

console.log('\n' + '='.repeat(60));
console.log('USERS TABLE COLUMNS:');
console.log('='.repeat(60));

// Get column info for users table
const usersColumns = db.prepare("PRAGMA table_info(users)").all();
usersColumns.forEach(col => {
    console.log(`  ${col.name.padEnd(20)} | ${col.type.padEnd(15)} | ${col.notnull ? 'NOT NULL' : 'NULL'.padEnd(8)} | ${col.pk ? 'PRIMARY KEY' : ''}`);
});

console.log('\n' + '='.repeat(60));
console.log('USER_GMAILS TABLE COLUMNS:');
console.log('='.repeat(60));

// Get column info for user_gmails table
const gmailsColumns = db.prepare("PRAGMA table_info(user_gmails)").all();
gmailsColumns.forEach(col => {
    console.log(`  ${col.name.padEnd(20)} | ${col.type.padEnd(15)} | ${col.notnull ? 'NOT NULL' : 'NULL'.padEnd(8)} | ${col.pk ? 'PRIMARY KEY' : ''}`);
});

console.log('\n' + '='.repeat(60));
console.log('SAMPLE DATA FROM USERS TABLE:');
console.log('='.repeat(60));

const sampleUsers = db.prepare('SELECT * FROM users LIMIT 2').all();
if (sampleUsers.length > 0) {
    const columns = Object.keys(sampleUsers[0]);
    console.log('Columns:', columns.join(', '));
    
    sampleUsers.forEach((user, index) => {
        console.log(`\nUser ${index + 1}:`);
        columns.forEach(col => {
            const value = user[col];
            const display = value === null ? 'NULL' : 
                         value === 0 ? '0' :
                         value === 1 ? '1' :
                         typeof value === 'string' ? `"${value}"` : value;
            console.log(`  ${col}: ${display}`);
        });
    });
}

console.log('\n' + '='.repeat(60));
console.log('SAMPLE DATA FROM USER_GMAILS TABLE:');
console.log('='.repeat(60));

const sampleGmails = db.prepare('SELECT * FROM user_gmails LIMIT 2').all();
if (sampleGmails.length > 0) {
    const columns = Object.keys(sampleGmails[0]);
    console.log('Columns:', columns.join(', '));
    
    sampleGmails.forEach((gmail, index) => {
        console.log(`\nGmail ${index + 1}:`);
        columns.forEach(col => {
            const value = gmail[col];
            const display = value === null ? 'NULL' : 
                         value === 0 ? '0' :
                         value === 1 ? '1' :
                         typeof value === 'string' ? `"${value}"` : value;
            console.log(`  ${col}: ${display}`);
        });
    });
} else {
    console.log('No data in user_gmails table');
}

db.close();
