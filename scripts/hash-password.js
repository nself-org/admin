#!/usr/bin/env node

const bcrypt = require('bcryptjs')
const fs = require('fs')
const path = require('path')
const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

async function hashPassword(password) {
  return bcrypt.hash(password, 10)
}

async function main() {
  console.log('\n🔐 nself-admin Password Hasher\n')
  console.log('This tool will help you generate a secure bcrypt hash for your admin password.')
  console.log('You can then use this hash in your .env.local file.\n')

  rl.question('Enter the password you want to hash: ', async (password) => {
    if (!password) {
      console.error('❌ Password cannot be empty')
      rl.close()
      process.exit(1)
    }

    try {
      const hash = await hashPassword(password)

      console.log('\n✅ Password hashed successfully!\n')
      console.log('Add this to your .env.local file:')
      console.log(`ADMIN_PASSWORD="${hash}"\n`)

      rl.question('Do you want to update .env.local automatically? (y/n): ', (answer) => {
        if (answer.toLowerCase() === 'y') {
          const envPath = path.join(__dirname, '..', '.env.local')

          try {
            let envContent = ''
            if (fs.existsSync(envPath)) {
              envContent = fs.readFileSync(envPath, 'utf8')
              // Replace existing ADMIN_PASSWORD
              if (envContent.includes('ADMIN_PASSWORD=')) {
                envContent = envContent.replace(/ADMIN_PASSWORD=.*/g, `ADMIN_PASSWORD="${hash}"`)
              } else {
                envContent += `\n# Admin Authentication (bcrypt hashed)\nADMIN_PASSWORD="${hash}"\n`
              }
            } else {
              envContent = `# nAdmin Authentication (bcrypt hashed)\nADMIN_PASSWORD="${hash}"\n\n# API Configuration\nNEXT_PUBLIC_API_URL=http://localhost:3001\n\n# Project Path\nPROJECT_PATH=./\n`
            }

            fs.writeFileSync(envPath, envContent)
            console.log('✅ .env.local updated successfully!')
          } catch (error) {
            console.error('❌ Failed to update .env.local:', error.message)
          }
        }

        rl.close()
      })
    } catch (error) {
      console.error('❌ Failed to hash password:', error.message)
      rl.close()
      process.exit(1)
    }
  })
}

main()
