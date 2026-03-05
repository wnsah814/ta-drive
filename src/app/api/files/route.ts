import { NextRequest, NextResponse } from "next/server";
import { supabase, BUCKET_NAME } from "@/lib/supabase";
import { encodePath, encodeSegment, decodeSegment, FOLDER_PLACEHOLDER } from "@/lib/storage-path";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path") ?? "";
  const storagePath = encodePath(path);

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list(storagePath, {
      sortBy: { column: "created_at", order: "desc" },
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = (data ?? [])
    .filter((f) => f.name !== FOLDER_PLACEHOLDER)
    .map((f) => ({
      name: decodeSegment(f.name),
      type: f.id === null ? ("folder" as const) : ("file" as const),
      size: f.metadata?.size ?? 0,
      createdAt: f.created_at,
    }));

  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const path = (formData.get("path") as string) ?? "";

  if (!file) {
    return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "파일 크기는 50MB를 초과할 수 없습니다." },
      { status: 400 }
    );
  }

  const buffer = await file.arrayBuffer();
  const storagePath = encodePath(path);
  const filePath = `${storagePath}${encodeSegment(file.name)}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(request: NextRequest) {
  const { from, to } = await request.json();

  if (!from || !to || typeof from !== "string" || typeof to !== "string") {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const fromPath = encodePath(from);
  const toPath = encodePath(to);

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .move(fromPath, toPath);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
