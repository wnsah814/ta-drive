import { NextResponse } from "next/server";
import { supabase, BUCKET_NAME } from "@/lib/supabase";
import { encodePath } from "@/lib/storage-path";

type Params = { params: Promise<{ path: string[] }> };

export async function GET(_request: Request, { params }: Params) {
  const { path } = await params;
  const storagePath = encodePath(path.join("/"));

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .download(storagePath);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  const displayName = path[path.length - 1];
  const headers = new Headers();
  headers.set(
    "Content-Disposition",
    `attachment; filename*=UTF-8''${encodeURIComponent(displayName)}`
  );
  headers.set("Content-Type", data.type || "application/octet-stream");

  return new NextResponse(data, { headers });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { path } = await params;
  const storagePath = encodePath(path.join("/"));

  const { data: children } = await supabase.storage
    .from(BUCKET_NAME)
    .list(storagePath);

  if (children && children.length > 0) {
    // It's a folder — collect all nested files, reusing the already-fetched children
    const filesToDelete = await collectFiles(storagePath, children);
    if (filesToDelete.length > 0) {
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove(filesToDelete);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
  } else {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([storagePath]);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}

interface StorageItem {
  name: string;
  id: string | null;
}

async function collectFiles(
  prefix: string,
  items: StorageItem[]
): Promise<string[]> {
  const files: string[] = [];
  const subfolderPromises: Promise<string[]>[] = [];

  for (const item of items) {
    const itemPath = `${prefix}/${item.name}`;
    if (item.id === null) {
      subfolderPromises.push(listAllFiles(itemPath));
    } else {
      files.push(itemPath);
    }
  }

  const nestedResults = await Promise.all(subfolderPromises);
  return files.concat(...nestedResults);
}

async function listAllFiles(prefix: string): Promise<string[]> {
  const { data } = await supabase.storage.from(BUCKET_NAME).list(prefix);
  if (!data) return [];
  return collectFiles(prefix, data);
}
