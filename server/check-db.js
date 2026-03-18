const Database = require('better-sqlite3');
const path = require('path');

// Connect to the database
const db = new Database(path.join(__dirname, 'data', 'app.db'));

console.log('=== DATABASE VERIFICATION ===');

// Check all users
const allUsers = db.prepare('SELECT id, username, name, has_face, has_voice, created_at FROM users ORDER BY created_at DESC LIMIT 10').all();
console.log('Total users found:', allUsers.length);
console.log('Recent users:');
allUsers.forEach(user => {
    console.log(`  ID: ${user.id}, Username: "${user.username}", Name: "${user.name}", Face: ${user.has_face}, Voice: ${user.has_voice}, Created: ${new Date(user.created_at * 1000).toLocaleString()}`);
});

// Check specific usernames that might have been registered
console.log('\n=== SEARCHING FOR COMMON USERNAMES ===');
const commonNames = ['test', 'user', 'demo', 'john', 'admin'];
commonNames.forEach(name => {
    const user = db.prepare('SELECT * FROM users WHERE lower(username) = lower(?)').get(name);
    if (user) {
        console.log(`✅ Found user "${name}": ID ${user.id}, Face: ${user.has_face}, Voice: ${user.has_voice}`);
    } else {
        console.log(`❌ No user found for "${name}"`);
    }
});

// Check database file info
const fs = require('fs');
const dbPath = path.join(__dirname, 'data', 'app.db');
if (fs.existsSync(dbPath)) {
    const stats = fs.statSync(dbPath);
    console.log(`\nDatabase file size: ${stats.size} bytes`);
    console.log(`Last modified: ${stats.mtime.toLocaleString()}`);
} else {
    console.log('\n❌ Database file not found!');
}

db.close();
