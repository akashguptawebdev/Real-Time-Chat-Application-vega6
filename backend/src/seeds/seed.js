import bcrypt from 'bcryptjs';
import { sequelize, User } from '../models/index.js';

async function main() {
  console.log('Seeding database users...');
  await sequelize.authenticate();

  const dummyUsers = [
    {
      name: 'Sarah Chen',
      email: 'sarah.chen@example.com',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    },
    {
      name: 'Alex Rivera',
      email: 'alex.rivera@example.com',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    },
    {
      name: 'Maya Patel',
      email: 'maya.patel@example.com',
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    },
    {
      name: 'David Kim',
      email: 'david.kim@example.com',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    },
  ];

  const defaultPassword = 'password123';
  const passwordHash = await bcrypt.hash(defaultPassword, 12);

  for (const u of dummyUsers) {
    const existing = await User.findOne({ where: { email: u.email } });
    if (!existing) {
      await User.create({
        name: u.name,
        email: u.email,
        passwordHash,
        avatarUrl: u.avatarUrl,
        lastSeenAt: new Date(),
      });
      console.log(` Created sample user: ${u.name} (${u.email})`);
    } else {
      console.log(` User already exists: ${u.name}`);
    }
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => sequelize.close());
