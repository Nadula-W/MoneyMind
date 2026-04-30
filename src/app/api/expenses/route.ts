import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

// ✅ GET ALL
export async function GET() {
  const client = await clientPromise;
  const db = client.db("moneymind");

  const expenses = await db
    .collection("expenses")
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  return Response.json(expenses);
}

// ✅ ADD
export async function POST(req: Request) {
  const body = await req.json();

  const client = await clientPromise;
  const db = client.db("moneymind");

  const result = await db.collection("expenses").insertOne({
    ...body,
    createdAt: body.createdAt || new Date().toISOString(),
  });

  return Response.json(result);
}

// ✏️ UPDATE
export async function PUT(req: Request) {
  const body = await req.json();

  const client = await clientPromise;
  const db = client.db("moneymind");

  const { id, ...updates } = body;

  await db.collection("expenses").updateOne(
    { _id: new ObjectId(id) },
    { $set: updates }
  );

  return Response.json({ success: true });
}

// ❌ DELETE
export async function DELETE(req: Request) {
  const { id } = await req.json();

  const client = await clientPromise;
  const db = client.db("moneymind");

  await db.collection("expenses").deleteOne({
    _id: new ObjectId(id),
  });

  return Response.json({ success: true });
}