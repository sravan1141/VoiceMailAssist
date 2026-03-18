const Database = require('better-sqlite3');
const path = require('path');

// Connect to the database
const db = new Database(path.join(__dirname, 'data', 'app.db'));

console.log('=== CHECKING EMAIL-DERIVED USERNAMES ===\n');

// Check for users who might have email-derived usernames with numbers
const suspiciousUsers = db.prepare(`
    SELECT id, username, name, email 
    FROM users 
    WHERE username LIKE '%1' OR username LIKE '%2' OR username LIKE '%3'
    ORDER BY id
`).all();

console.log('Users with potential email-derived usernames:');
suspiciousUsers.forEach(user => {
    console.log(`  ID: ${user.id}, Username: "${user.username}", Name: "${user.name}", Email: "${user.email || 'NULL'}"`);
});

// Function to generate username from display name
const generateUsernameFromName = (name) => {
    return name.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
};

console.log('\n=== ANALYZING USER 2 (sravankatukuri1) ===\n');

const user2 = db.prepare('SELECT id, username, name, email FROM users WHERE id = 2').get();
if (user2) {
    console.log('Current user 2 details:');
    console.log(`  Username: "${user2.username}"`);
    console.log(`  Name: "${user2.name}"`);
    console.log(`  Email: "${user2.email || 'NULL'}"`);
    
    const expectedFromName = generateUsernameFromName(user2.name);
    console.log(`  Expected username from name: "${expectedFromName}"`);
    
    // Check if this looks like email-derived (has number at end)
    const hasNumberSuffix = /\d+$/.test(user2.username);
    console.log(`  Has number suffix: ${hasNumberSuffix}`);
    
    if (hasNumberSuffix && user2.email) {
        const emailBase = user2.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_');
        console.log(`  Email base part: "${emailBase}"`);
        
        if (user2.username.startsWith(emailBase)) {
            console.log(`  → This appears to be email-derived with suffix`);
            
            // Ask what to do
            console.log(`\n  OPTIONS:`);
            console.log(`  1. Keep as-is (might be intentional)`);
            console.log(`  2. Change to name-derived: "${expectedFromName}"`);
            console.log(`  3. Change to email-base without suffix: "${emailBase}"`);
            
            // For now, let's use the name-based one since it's more user-friendly
            const newUsername = expectedFromName;
            
            // Check for conflicts
            const conflict = db.prepare('SELECT id FROM users WHERE lower(username) = lower(?) AND id != ?').get(newUsername, user2.id);
            if (!conflict) {
                const updateResult = db.prepare('UPDATE users SET username = ? WHERE id = ?').run(newUsername, user2.id);
                if (updateResult.changes > 0) {
                    console.log(`  ✅ UPDATED: Username changed to "${newUsername}"`);
                }
            } else {
                console.log(`  ⚠️  CANNOT UPDATE: Username "${newUsername}" already exists`);
            }
        }
    }
}

console.log('\n=== FINAL STATE ===\n');

const finalUsers = db.prepare('SELECT id, username, name FROM users ORDER BY id').all();
finalUsers.forEach(user => {
    console.log(`  ID: ${user.id}, Username: "${user.username}", Name: "${user.name}"`);
});

db.close();
