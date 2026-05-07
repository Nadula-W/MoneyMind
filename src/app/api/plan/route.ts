import clientPromise from "../../../lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("moneymind");

    const plan = await db.collection("plan").findOne({});
    return Response.json(plan || {});
  } catch (error: any) {
    console.error("GET /api/plan error:", error);
    return Response.json(
      { error: "Failed to fetch plan", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const client = await clientPromise;
    const db = client.db("moneymind");

    await db.collection("plan").updateOne(
      {},
      {
        $set: {
          goal: body.goal,
          months: body.months,
          predictedIncome: body.predictedIncome,
        },
      },
      { upsert: true }
    );

    return Response.json({ success: true });
  } catch (error: any) {
    console.error("POST /api/plan error:", error);
    return Response.json(
      { error: "Failed to save plan", details: error.message },
      { status: 500 }
    );
  }
}