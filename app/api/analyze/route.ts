import { NextRequest, NextResponse } from "next/server";

const WORKER_URL = process.env.WORKER_URL || "http://127.0.0.1:8000";
const MAX_SERVERLESS_BYTES = 4.5 * 1024 * 1024; // 4.5 MB hard limit on Vercel Serverless

export const maxDuration = 120; // 2 minutes timeout for large songs
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const routeName = "/api/analyze";
  const contentType = req.headers.get("content-type") || "";
  const contentLength = req.headers.get("content-length");

  // Safe Diagnostic Logging (Never logs audio content, API keys, or user secrets)
  if (process.env.NODE_ENV !== "production" || process.env.ENABLE_DIAGNOSTICS === "true") {
    console.log(
      `[Safe Diagnostics] Route: ${routeName} | Content-Type: ${contentType} | Content-Length: ${contentLength || "unknown"}`
    );
  }

  // 1. Validate Media Type (Reject non-multipart requests with HTTP 415)
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return NextResponse.json(
      {
        detail:
          'Unsupported Media Type. Request Content-Type must be "multipart/form-data".',
      },
      { status: 415 }
    );
  }

  // 2. Early Content-Length check for oversized payloads (HTTP 413)
  if (contentLength && parseInt(contentLength, 10) > MAX_SERVERLESS_BYTES) {
    const sizeMB = (parseInt(contentLength, 10) / (1024 * 1024)).toFixed(2);
    return NextResponse.json(
      {
        detail: `Payload size (${sizeMB} MB) exceeds maximum serverless limit of 4.5 MB. Please use client-side acoustic processing.`,
      },
      { status: 413 }
    );
  }

  try {
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (parseErr: unknown) {
      const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
      return NextResponse.json(
        {
          detail: `Failed to parse upload form data. Payload may have exceeded platform server limits. Error: ${msg}`,
        },
        { status: 413 }
      );
    }

    const audio = formData.get("audio");
    const lyrics = formData.get("lyrics");

    if (!audio || !lyrics) {
      return NextResponse.json(
        { detail: "Both audio file and lyrics are required." },
        { status: 400 }
      );
    }

    // Server-side audio size validation
    if (audio instanceof Blob && audio.size > MAX_SERVERLESS_BYTES) {
      const audioMB = (audio.size / (1024 * 1024)).toFixed(2);
      return NextResponse.json(
        {
          detail: `Audio file (${audioMB} MB) exceeds maximum serverless limit of 4.5 MB.`,
        },
        { status: 413 }
      );
    }

    // Forward to FastAPI worker
    const targetUrl = `${WORKER_URL.replace(/\/+$/, "")}/analyze`;

    const outgoingFormData = new FormData();
    outgoingFormData.append("audio", audio);
    outgoingFormData.append("lyrics", lyrics as string);

    let workerRes: Response;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

      workerRes = await fetch(targetUrl, {
        method: "POST",
        body: outgoingFormData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
    } catch (fetchErr: unknown) {
      const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      return NextResponse.json(
        {
          detail: `Backend audio engine is not reachable at ${WORKER_URL}. Please ensure worker service is active. Error: ${msg}`,
        },
        { status: 503 }
      );
    }

    if (!workerRes.ok) {
      let errorBody = `Audio worker error (${workerRes.status})`;
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

