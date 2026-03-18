const Database = require('better-sqlite3');
const path = require('path');

// Connect to the database
const db = new Database(path.join(__dirname, 'data', 'app.db'));

console.log('=== FIXING INCORRECT USERNAMES ===\n');

// Get all users to check for username issues
const allUsers = db.prepare('SELECT id, username, name FROM users ORDER BY id').all();
console.log('Current users:');
allUsers.forEach(user => {
    console.log(`  ID: ${user.id}, Username: "${user.username}", Name: "${user.name}"`);
});

// Function to clean username (same as frontend processing)
const cleanUsername = (input) => {
    return input.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
};

// Function to generate a clean username from name
const generateUsernameFromName = (name) => {
    return cleanUsername(name);
};

console.log('\n=== CHECKING AND FIXING USERNAMES ===\n');

let fixedCount = 0;

allUsers.forEach(user => {
    console.log(`\nChecking user ID ${user.id}:`);
    console.log(`  Current username: "${user.username}"`);
    console.log(`  Name: "${user.name}"`);
    
    // Check if username has unwanted suffixes like _1, _2, etc.
    const hasUnwantedSuffix = /_\d+$/.test(user.username);
    
    // Check if username can be derived from name
    const expectedUsername = generateUsernameFromName(user.name);
    const usernameFromName = expectedUsername === user.username;
    
    console.log(`  Has unwanted suffix (_1, _2, etc): ${hasUnwantedSuffix}`);
    console.log(`  Username matches cleaned name: ${usernameFromName}`);
    console.log(`  Expected username from name: "${expectedUsername}"`);
    
    let needsFix = false;
    let newUsername = user.username;
    
    if (hasUnwantedSuffix && !usernameFromName) {
        // Remove suffix and use clean name
        newUsername = expectedUsername;
        needsFix = true;
        console.log(`  → FIX: Remove suffix, use name: "${newUsername}"`);
    } else if (hasUnwantedSuffix && usernameFromName) {
        // Just remove the suffix
        newUsername = user.username.replace(/_\d+$/, '');
        needsFix = true;
        console.log(`  → FIX: Remove suffix only: "${newUsername}"`);
    }
    
    if (needsFix) {
        // Check if new username would conflict
        const existingCheck = db.prepare('SELECT id FROM users WHERE lower(username) = lower(?) AND id != ?').get(newUsername, user.id);
        if (existingCheck) {
            console.log(`  ⚠️  CANNOT FIX: Username "${newUsername}" already exists for user ID ${existingCheck.id}`);
            return;
        }
        
        // Update the username
        const updateResult = db.prepare('UPDATE users SET username = ? WHERE id = ?').run(newUsername, user.id);
        if (updateResult.changes > 0) {
            console.log(`  ✅ FIXED: Updated username to "${newUsername}"`);
            fixedCount++;
        } else {
            console.log(`  ❌ FAILED: Could not update username`);
        }
    } else {
        console.log(`  ✅ OK: Username is correct`);
    }
});

console.log(`\n${'='.repeat(50)}`);
console.log(`FIX SUMMARY: ${fixedCount} usernames fixed`);
console.log(`${'='.repeat(50)}`);

// Show final state
console.log('\nFinal user list:');
const finalUsers = db.prepare('SELECT id, username, name FROM users ORDER BY id').all();
finalUsers.forEach(user => {
    console.log(`  ID: ${user.id}, Username: "${user.username}", Name: "${user.name}"`);
});

db.close();
