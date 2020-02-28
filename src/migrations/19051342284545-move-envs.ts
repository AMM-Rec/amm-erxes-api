import * as dotenv from 'dotenv';
import * as mongoose from 'mongoose';

dotenv.config();

const options = {
  useNewUrlParser: true,
  useCreateIndex: true,
};

const ENVS = [
  'PUBSUB_TYPE',
  'UPLOAD_SERVICE_TYPE',
  'FILE_SYSTEM_PUBLIC',
  'COMPANY_EMAIL_FROM',
  'DEFAULT_EMAIL_SERVICE',
  'MAIL_SERVICE',
  'MAIL_PORT',
  'MAIL_USER',
  'MAIL_PASS',
  'MAIL_HOST',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_BUCKET',
  'AWS_PREFIX',
  'AWS_COMPATIBLE_SERVICE_ENDPOINT',
  'AWS_FORCE_PATH_STYLE',

  'AWS_SES_ACCESS_KEY_ID',
  'AWS_SES_SECRET_ACCESS_KEY',
  'AWS_REGION',
  'AWS_SES_CONFIG_SET',

  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_APPLICATION_CREDENTIALS',
  'GOOGLE_TOPIC',
  'GOOGLE_SUBSCRIPTION_NAME',
  'GOOGLE_PROJECT_ID',
  'GOOGLE_CLOUD_STORAGE_BUCKET',

  'UPLOAD_FILE_TYPES',
  'WIDGETS_UPLOAD_FILE_TYPES',
];

module.exports.up = async () => {
  const MONGO_URL = process.env.MONGO_URL || '';

  // ignore on saas
  if (MONGO_URL.includes('erxes_')) {
    return;
  }

  const mongoClient = await mongoose.createConnection(MONGO_URL || '', options);

  const configsCollection = mongoClient.db.collection('configs');
  const configs = await configsCollection.find({}).toArray();

  if (configs.length !== 0) {
    return;
  }

  for (const env of ENVS) {
    await configsCollection.insert({ code: env, value: process.env[env] });
  }
};
