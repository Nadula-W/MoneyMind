import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI!;

if (!uri) {
  throw new Error("Please add MONGODB_URI to .env.local");
}

const client = new MongoClient(uri);

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  // reuse connection in dev
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    globalWithMongo._mongoClientPromise = client.connect();
  }

  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  clientPromise = client.connect();
}

export default clientPromise;