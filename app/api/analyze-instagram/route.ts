import { NextResponse } from "next/server";
import { runCreatorAnalysis } from "@/lib/analytics/runCreatorAnalysis";
import { getInstagramProvider } from "@/lib/providers/instagram/getInstagramProvider";
import { InstagramProviderError } from "@/lib/providers/instagram/types";

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Le corps JSON est invalide." }, { status: 400 });
  }

  const username =
    typeof payload === "object" &&
    payload !== null &&
    "username" in payload &&
    typeof payload.username === "string"
      ? payload.username.trim()
      : "";
  if (!username || !/^@?[a-zA-Z0-9._]{1,30}$/.test(username)) {
    return NextResponse.json(
      { error: "Saisissez un username Instagram valide." },
      { status: 400 },
    );
  }

  try {
    const provider = getInstagramProvider();
    const input = await provider.collect(username);
    return NextResponse.json(runCreatorAnalysis(input, provider.id));
  } catch (error) {
    if (error instanceof InstagramProviderError) {
      const status =
        error.code === "CONFIGURATION_ERROR" ? 503 : error.code === "PROFILE_NOT_FOUND" ? 404 : 502;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    return NextResponse.json({ error: "L’analyse n’a pas pu être générée." }, { status: 500 });
  }
}
