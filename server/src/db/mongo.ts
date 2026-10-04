import mongoose from 'mongoose';
import { env } from '../config/env';

type MongoUriSummary = {
  scheme: string;
  hosts: string;
  database: string | null;
  authSource: string;
  username: string | null;
  passwordProvided: boolean;
};

const URI_PATTERN =
  /^mongodb(\+srv)?:\/\/(?:([^:@/]+)(?::([^@]*))?@)?([^/?]+)(?:\/([^?]*))?(?:\?(.*))?$/;

export function summarizeMongoUri(uri: string): MongoUriSummary {
  const match = URI_PATTERN.exec(uri.trim());

  if (!match) {
    return {
      scheme: 'unrecognized',
      hosts: 'unrecognized',
      database: null,
      authSource: 'unrecognized',
      username: null,
      passwordProvided: false,
    };
  }

  const [, srv, username, password, hosts, database, query] = match;
  const params = new URLSearchParams(query || '');
  const explicitAuthSource = params.get('authSource');

  return {
    scheme: srv ? 'mongodb+srv' : 'mongodb',
    hosts: hosts.indexOf('@') === -1 ? hosts : 'malformed (unencoded @ in credentials)',
    database: database ? decodeURIComponent(database) : null,
    authSource: explicitAuthSource || database || 'admin',
    username: username ? decodeURIComponent(username) : null,
    passwordProvided: Boolean(password),
  };
}

export async function connectMongo() {
  mongoose.set('strictQuery', true);

  if (!process.env.MONGO_URI && process.env.NODE_ENV === 'production') {
    throw new Error(
      'MONGO_URI is not set. The localhost fallback is not usable in production; ' +
        'set MONGO_URI in the Render dashboard.'
    );
  }

  const summary = summarizeMongoUri(env.MONGO_URI);
  console.log('[mongo] connecting to', JSON.stringify(summary));

  try {
    await mongoose.connect(env.MONGO_URI);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    if (/authentication failed|bad auth/i.test(message)) {
      throw new Error(
        `[mongo] Authentication rejected for user "${summary.username || '<none>'}" against ` +
          `${summary.scheme}://${summary.hosts} using authSource "${summary.authSource}". ` +
          'Verify the username exists in that authSource database, verify the password, and ' +
          'percent-encode any reserved characters (@ : / ? # [ ] %) in it. ' +
          `Underlying error: ${message}`
      );
    }

    throw err;
  }

  return mongoose;
}
