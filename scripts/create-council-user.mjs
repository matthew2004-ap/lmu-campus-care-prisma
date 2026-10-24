import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const [name, emailRaw, password, role, matric = ''] = process.argv.slice(2);
const email = String(emailRaw || '').trim().toLowerCase();
if (!name || !email || !password || !['welfare', 'transport', 'pro', 'vcm'].includes(role || '')) {
  console.error('Usage: npm run council:create -- "Full Name" email@lmu.edu.ng "StrongPassword" welfare|transport|pro|vcm [MAT_NUMBER]');
  process.exit(1);
}
if (password.length < 12) { console.error('Use a council password with at least 12 characters.'); process.exit(1); }
if (!email.endsWith('@lmu.edu.ng')) { console.error('Council email must use @lmu.edu.ng.'); process.exit(1); }
try {
  const password_hash = await bcrypt.hash(password, 12);
  const user = await prisma.profile.upsert({ where: { email }, update: { full_name: name.trim(), password_hash, role: 'council', council_role: role, council_active: true, ...(matric ? { matric_no: matric } : {}) }, create: { full_name: name.trim(), email, password_hash, role: 'council', council_role: role, council_active: true, ...(matric ? { matric_no: matric } : {}) } });
  console.log(`Council account ready: ${user.email} (${role})`);
} catch (error) { console.error('Could not create council account:', error instanceof Error ? error.message : error); process.exitCode = 1; }
finally { await prisma.$disconnect(); }
