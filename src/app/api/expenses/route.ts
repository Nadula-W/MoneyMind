import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

// ✅ GET ALL
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("moneymind");

    const expenses = await db
      .collection("expenses")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return Response.json(expenses);
  } catch (error: any) {
    console.error("GET /api/expenses error:", error);
    return Response.json(
      { error: "Failed to fetch expenses", details: error.message },
      { status: 500 }
    );
  }
}

// ✅ ADD
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const client = await clientPromise;
    const db = client.db("moneymind");

    const result = await db.collection("expenses").insertOne({
      ...body,
      createdAt: body.createdAt || new Date().toISOString(),
    });

    return Response.json(result);
  } catch (error: any) {
    console.error("POST /api/expenses error:", error);
    return Response.json(
      { error: "Failed to create expense", details: error.message },
      { status: 500 }
    );
  }
}

// ✏️ UPDATE
export async function PUT(req: Request) {
  try {
    const body = await req.json();

    const client = await clientPromise;
    const db = client.db("moneymind");

    const { id, ...updates } = body;

    await db.collection("expenses").updateOne(
      { _id: new ObjectId(id) },
      { $set: updates }
    );

    return Response.json({ success: true });
  } catch (error: any) {
    console.error("PUT /api/expenses error:", error);
    return Response.json(
      { error: "Failed to update expense", details: error.message },
      { status: 500 }
    );
  }
}

// ❌ DELETE
export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();

    const client = await clientPromise;
    const db = client.db("moneymind");

    await db.collection("expenses").deleteOne({
      _id: new ObjectId(id),
    });

    return Response.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/expenses error:", error);
    return Response.json(
      { error: "Failed to delete expense", details: error.message },
      { status: 500 }
    );
  }
}