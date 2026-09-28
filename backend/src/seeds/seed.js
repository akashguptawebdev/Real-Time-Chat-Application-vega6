import { sequelize, User, Conversation, ConversationMember, DirectConversation, Message } from '../models/index.js';

async function main() {
  console.log('Seeding database...');
  console.log('Seeding complete!');
}

main().catch((e) => { console.error('Seed failed:', e); process.exit(1); }).finally(() => sequelize.close());
