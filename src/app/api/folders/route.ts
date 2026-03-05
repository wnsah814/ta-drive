import { NextResponse } from "next/server";
import { supabase, BUCKET_NAME } from "@/lib/supabase";
import { encodePath, encodeSegment, FOLDER_PLACEHOLDER } from "@/lib/storage-path";

export async function POST(request: Request) {
  const { name, path = "" } = await request.json();

  if (!name || typeof name !== "string") {
    return NextResponse.json(
      { error: "폴더 이름이 필요합니다." },
      { status: 400 }
    );
  }

  const storagePath = encodePath(path);
  const folderPath = `${storagePath}${encodeSegment(name)}/${FOLDER_PLACEHOLDER}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(folderPath, new Uint8Array(0), {
      contentType: "application/octet-stream",
      upsert: true,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
