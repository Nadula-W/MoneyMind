import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

let clientPromise: Promise<MongoClient>;

if (!uri) {
  // Return a rejected promise that will be caught in API routes
  clientPromise = Promise.reject(new Error("MONGODB_URI environment variable not set"));
} else {
  const client = new MongoClient(uri);

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
}

export default clientPromise;