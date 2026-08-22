import clientPromise from "../../../lib/mongodb";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("moneymind");

    const plan = await db.collection("plan").findOne({});
    const normalized = plan
      ? {
          ...plan,
          income: plan.predictedIncome ?? plan.income,
        }
      : {};

    return NextResponse.json(normalized);
  } catch (error: any) {
    console.error("GET /api/plan error:", error);
    return NextResponse.json(
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
          // support both `predictedIncome` and `income` payloads
          predictedIncome: body.predictedIncome ?? body.income,
          // persist dailyBudget if provided
          dailyBudget: body.dailyBudget,
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST /api/plan error:", error);
    return NextResponse.json(
      { error: "Failed to save plan", details: error.message },
      { status: 500 }
    );
  }
}