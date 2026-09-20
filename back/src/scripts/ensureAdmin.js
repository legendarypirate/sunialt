const { Admin } = require('../models');

async function ensureAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@sunia.mn';
  const password = process.env.ADMIN_PASSWORD || 'admin123';

  const count = await Admin.count();
  if (count > 0) return;

  await Admin.create({
    name: 'SUNIA Admin',
    email,
    password,
    role: 'superadmin',
  });

  console.log(`Default admin created: ${email}`);
}

module.exports = { ensureAdmin };
