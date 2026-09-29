/**
 * Seed script — run once to populate the database with demo data.
 * Usage: node src/seeds/seed.js
 *
 * Creates:
 *   - 6 users (password: password123)
 *   - 2 group conversations (Team Alpha, Design Crew)
 *   - 2 direct conversations with message history
 */

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import {
  sequelize,
  User,
  Conversation,
  DirectConversation,
  ConversationMember,
  Message,
} from '../models/index.js';

async function main() {
  console.log('🌱 Starting seed...');
  await sequelize.authenticate();
  await sequelize.sync(); // ensure tables exist

  const passwordHash = await bcrypt.hash('password123', 12);

  // ── 1. Users ───────────────────────────────────────────────────────────────
  const usersData = [
    { name: 'Sarah Chen',   email: 'sarah@demo.com',  avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah' },
    { name: 'Alex Rivera',  email: 'alex@demo.com',   avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex' },
    { name: 'Maya Patel',   email: 'maya@demo.com',   avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maya' },
    { name: 'David Kim',    email: 'david@demo.com',  avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David' },
    { name: 'Priya Nair',   email: 'priya@demo.com',  avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Priya' },
    { name: 'Omar Hassan',  email: 'omar@demo.com',   avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Omar' },
  ];

  const users = [];
  for (const u of usersData) {
    let user = await User.findOne({ where: { email: u.email } });
    if (!user) {
      user = await User.create({ ...u, passwordHash, lastSeenAt: new Date() });
      console.log(`  ✅ Created user: ${u.name}`);
    } else {
      console.log(`  ↩️  Exists: ${u.name}`);
    }
    users.push(user);
  }

  const [sarah, alex, maya, david, priya, omar] = users;

  // ── 2. Helper: create direct conversation ──────────────────────────────────
  const createDirect = async (userA, userB) => {
    const userLowId  = userA.id < userB.id ? userA.id : userB.id;
    const userHighId = userA.id < userB.id ? userB.id : userA.id;

    const existing = await DirectConversation.findOne({ where: { userLowId, userHighId } });
    if (existing) {
      console.log(`  ↩️  DM exists between ${userA.name} & ${userB.name}`);
      return (await Conversation.findByPk(existing.conversationId));
    }

    return await sequelize.transaction(async (t) => {
      const conv = await Conversation.create({ type: 'direct', createdBy: userA.id }, { transaction: t });
      await DirectConversation.create({ conversationId: conv.id, userLowId, userHighId }, { transaction: t });
      await ConversationMember.bulkCreate([
        { conversationId: conv.id, userId: userA.id, role: 'MEMBER' },
        { conversationId: conv.id, userId: userB.id, role: 'MEMBER' },
      ], { transaction: t });
      console.log(`  ✅ DM: ${userA.name} ↔ ${userB.name}`);
      return conv;
    });
  };

  // ── 3. Helper: create group ────────────────────────────────────────────────
  const createGroup = async (name, owner, admins = [], members = []) => {
    const existing = await Conversation.findOne({ where: { type: 'group', name } });
    if (existing) {
      console.log(`  ↩️  Group exists: ${name}`);
      return existing;
    }

    return await sequelize.transaction(async (t) => {
      const conv = await Conversation.create({ type: 'group', name, createdBy: owner.id }, { transaction: t });
      await ConversationMember.create({ conversationId: conv.id, userId: owner.id, role: 'OWNER' }, { transaction: t });
      for (const a of admins) {
        await ConversationMember.create({ conversationId: conv.id, userId: a.id, role: 'ADMIN' }, { transaction: t });
      }
      for (const m of members) {
        await ConversationMember.create({ conversationId: conv.id, userId: m.id, role: 'MEMBER' }, { transaction: t });
      }
      console.log(`  ✅ Group: ${name}`);
      return conv;
    });
  };

  // ── 4. Helper: add messages ────────────────────────────────────────────────
  const addMessages = async (convId, msgList) => {
    for (const { sender, content, minsAgo } of msgList) {
      const created_at = new Date(Date.now() - minsAgo * 60 * 1000);
      const exists = await Message.findOne({ where: { conversationId: convId, senderId: sender.id, content } });
      if (!exists) {
        await Message.create({
          conversationId: convId,
          senderId: sender.id,
          clientMessageId: crypto.randomUUID(),
          content,
          created_at,
        });
      }
    }
  };

  // ── 5. Direct conversations ────────────────────────────────────────────────
  const dm1 = await createDirect(sarah, alex);
  await addMessages(dm1.id, [
    { sender: sarah, content: 'Hey Alex! Are you free for a quick call?', minsAgo: 120 },
    { sender: alex,  content: 'Sure! Give me 10 minutes to wrap up this PR.', minsAgo: 118 },
    { sender: sarah, content: 'No rush — ping me when ready 👍', minsAgo: 117 },
    { sender: alex,  content: "I'm done! Jumping in now.", minsAgo: 107 },
    { sender: sarah, content: 'Great, see you in the meet!', minsAgo: 106 },
  ]);

  const dm2 = await createDirect(maya, david);
  await addMessages(dm2.id, [
    { sender: maya,  content: 'David, did you push the design tokens yet?', minsAgo: 90 },
    { sender: david, content: 'Almost! I had a Figma issue but it is sorted now.', minsAgo: 88 },
    { sender: maya,  content: "No worries, I'll review once it's up.", minsAgo: 86 },
    { sender: david, content: 'Just pushed — branch is design/tokens-v2', minsAgo: 60 },
    { sender: maya,  content: 'On it 👀', minsAgo: 58 },
  ]);

  // Also seed a DM between priya & omar
  const dm3 = await createDirect(priya, omar);
  await addMessages(dm3.id, [
    { sender: priya, content: 'Omar, the staging env is down again 😩', minsAgo: 45 },
    { sender: omar,  content: "Checking now... looks like the DB pod restarted.", minsAgo: 43 },
    { sender: priya, content: 'Any ETA on the fix?', minsAgo: 42 },
    { sender: omar,  content: "Should be back in ~5 min. I'm restarting the service.", minsAgo: 40 },
    { sender: priya, content: "It's back! Thanks Omar 🙌", minsAgo: 35 },
  ]);

  // ── 6. Group conversations ─────────────────────────────────────────────────
  const teamAlpha = await createGroup('Team Alpha 🚀', sarah, [alex], [maya, david, priya, omar]);
  await addMessages(teamAlpha.id, [
    { sender: sarah, content: 'Team, sprint planning is tomorrow at 10 AM IST.', minsAgo: 200 },
    { sender: alex,  content: "I'll be there. Should I prepare the velocity chart?", minsAgo: 198 },
    { sender: sarah, content: 'Yes please! Also update the backlog estimates if you can.', minsAgo: 196 },
    { sender: maya,  content: 'I can handle the design tickets update.', minsAgo: 195 },
    { sender: david, content: "And I'll close out the tech-debt tasks before then.", minsAgo: 193 },
    { sender: priya, content: 'Same — I have two bug fixes to close by EOD.', minsAgo: 192 },
    { sender: omar,  content: "Infra is stable now. I'll add the deployment notes to Notion.", minsAgo: 190 },
    { sender: sarah, content: 'Awesome team! 🎉 See everyone tomorrow.', minsAgo: 188 },
  ]);

  const designCrew = await createGroup('Design Crew 🎨', maya, [david], [sarah, priya]);
  await addMessages(designCrew.id, [
    { sender: maya,  content: "Hey everyone! I've shared the new component library Figma link.", minsAgo: 300 },
    { sender: david, content: 'Looks great! The color palette is 🔥', minsAgo: 295 },
    { sender: sarah, content: 'I love the card components. Can we use them in the dashboard?', minsAgo: 290 },
    { sender: maya,  content: 'Absolutely! All components are production-ready.', minsAgo: 288 },
    { sender: priya, content: 'The typography scale is so clean. Great work Maya!', minsAgo: 280 },
    { sender: maya,  content: 'Thank you! I spent two days on the spacing system 😄', minsAgo: 275 },
  ]);

  console.log('\n✅ Seed complete!');
  console.log('   All users have password: password123');
  console.log('   Users: sarah@demo.com, alex@demo.com, maya@demo.com, david@demo.com, priya@demo.com, omar@demo.com');
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(() => sequelize.close());
