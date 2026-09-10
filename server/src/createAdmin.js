const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

const User = require('./models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/recoveryiq';

async function createAdminUser() {
  const args = process.argv.slice(2);
  const email = args[0];
  const password = args[1];
  const name = args[2] || 'Admin User';

  if (!email || !password) {
    console.error('❌ Error: Email and password are required.');
    console.log('\nUsage:');
    console.log('  npm run create-admin -- <email> <password> [name]');
    console.log('Example:');
    console.log('  npm run create-admin -- admin@recoveryiq.com yourSecurePassword "Platform Admin"\n');
    process.exit(1);
  }

  try {
    console.log('🔄 Connecting to MongoDB:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully.');

    const normalizedEmail = email.toLowerCase().trim();
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    let user = await User.findOne({ email: normalizedEmail });

    if (user) {
      console.log(`⚠️ User with email "${normalizedEmail}" already exists. Promoting to admin & updating credentials...`);
      user.password = hashedPassword;
      user.role = 'admin';
      if (args[2]) user.name = name.trim();
      await user.save();
      console.log(`✅ Admin account updated successfully for: ${normalizedEmail}`);
    } else {
      console.log(`Creating new administrator account for: ${normalizedEmail}...`);
      user = new User({
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: 'admin',
      });
      await user.save();
      console.log(`✅ Admin account created successfully for: ${normalizedEmail}`);
    }

    console.log('\n=================================================');
    console.log('👑 ADMIN ACCOUNT READY');
    console.log('=================================================');
    console.log(`  • Name:  ${user.name}`);
    console.log(`  • Email: ${user.email}`);
    console.log(`  • Role:  ${user.role}`);
    console.log('=================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to create/update admin user:', err.message);
    process.exit(1);
  }
}

createAdminUser();
