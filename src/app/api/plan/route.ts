import clientPromise from "../../../lib/mongodb";

export async function GET() {
  const client = await clientPromise;
  const db = client.db("moneymind");

  const plan = await db.collection("plan").findOne({});
  return Response.json(plan || {});
}

export async function POST(req: Request) {
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
}