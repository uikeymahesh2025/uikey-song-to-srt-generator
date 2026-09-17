import { NextRequest, NextResponse } from "next/server";

const WORKER_URL = process.env.WORKER_URL || "http://127.0.0.1:8000";

export const maxDuration = 120; // 2 minutes timeout for large songs
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audio = formData.get("audio");
    const lyrics = formData.get("lyrics");

    if (!audio || !lyrics) {
      return NextResponse.json(
        { detail: "Both audio file and lyrics are required." },
        { status: 400 }
      );
    }

    // Forward to FastAPI worker over IPv4 loopback
    const targetUrl = `${WORKER_URL.replace(/\/+$/, "")}/analyze`;
    
    // Create outgoing form data
    const outgoingFormData = new FormData();
    outgoingFormData.append("audio", audio);
    outgoingFormData.append("lyrics", lyrics as string);

    let workerRes: Response;
    try {
      workerRes = await fetch(targetUrl, {
        method: "POST",
        body: outgoingFormData,
      });
    } catch (fetchErr: unknown) {
      const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      return NextResponse.json(
        {
          detail: `Backend audio engine is not reachable at ${WORKER_URL}. Please verify the worker is running on port 8000. Error: ${msg}`,
        },
        { status: 503 }
      );
    }

    if (!workerRes.ok) {
      let errorBody = "Error in audio analysis worker.";
      try {
        const errorJson = await workerRes.json();
        errorBody = errorJson.detail || JSON.stringify(errorJson);
      } catch {
        errorBody = await workerRes.text();
      }
      return NextResponse.json(
        { detail: errorBody },
        { status: workerRes.status }
      );
    }

    const data = await workerRes.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
