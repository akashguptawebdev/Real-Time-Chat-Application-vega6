import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();

const dbUrl = process.env.DATABASE_URL;
const dbHost = process.env.DB_HOST;
const dbUser = process.env.DB_USER || 'postgres';
const dbPassword = process.env.DB_PASSWORD || '';
const dbName = process.env.DB_NAME || 'postgres';
const dbPort = Number(process.env.DB_PORT) || 5432;

const isSupabase = (dbUrl && (dbUrl.includes('supabase.co') || dbUrl.includes('pooler.supabase.com'))) || (dbHost && (dbHost.includes('supabase.co') || dbHost.includes('pooler.supabase.com')));
const isProduction = process.env.NODE_ENV === 'production';

const sslConfig = (isSupabase || isProduction || process.env.DB_SSL === 'true') ? {
  ssl: {
    require: true,
    rejectUnauthorized: false,
  },
} : {};

let sequelize;

if (dbUrl) {
  sequelize = new Sequelize(dbUrl, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: sslConfig,
  });
} else if (dbHost) {
  sequelize = new Sequelize(dbName, dbUser, dbPassword, {
    host: dbHost,
    port: dbPort,
    dialect: 'postgres',
    logging: false,
    dialectOptions: sslConfig,
  });
} else {
  sequelize = new Sequelize('postgres://postgres:password@localhost:5432/chat_app_dev', {
    dialect: 'postgres',
    logging: false,
    dialectOptions: sslConfig,
  });
}

export default sequelize;
