#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const bcrypt = require('bcryptjs')

// Path to the database
const dbPath = path.join(__dirname, '..', 'data', 'nadmin.db')

// Read the database
const dbContent = fs.readFileSync(dbPath, 'utf8')
const db = JSON.parse(dbContent)

// Find the config collection
const configCollection = db.collections.find((c) => c.name === 'config')

if (!configCollection) {
  console.error('Config collection not found in database')
  process.exit(1)
}

// New password (you can change this or pass as argument)
const newPassword = process.argv[2] || 'admin123'

// Hash the new password
const hash = bcrypt.hashSync(newPassword, 10)

// Find and update the admin_password_hash entry
const passwordEntry = configCollection.data.find((item) => item.key === 'admin_password_hash')

if (passwordEntry) {
  // Update existing password
  passwordEntry.value = hash
  passwordEntry.meta.updated = Date.now()
  console.log('✓ Password updated successfully')
} else {
  // Create new password entry
  configCollection.data.push({
    key: 'admin_password_hash',
    value: hash,
    meta: {
      revision: 0,
      created: Date.now(),
      version: 0,
      updated: Date.now(),
    },
    $loki: configCollection.data.length + 1,
  })
  console.log('✓ Password created successfully')
}

// Write back to database
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2))

console.log(`\n✅ Admin password has been reset to: ${newPassword}`)
console.log('\nYou can now login with this password at http://localhost:3021/login')
