"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

interface FileItem {
  name: string;
  type: "file" | "folder";
  size: number;
  createdAt: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function fileApiUrl(fullPath: string): string {
  return `/api/files/${fullPath.split("/").map(encodeURIComponent).join("/")}`;
}

export default function DashboardPage() {
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const [currentPath, setCurrentPath] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/files?path=${encodeURIComponent(currentPath)}`
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setItems(data);
    } catch {
      setError("파일 목록을 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  }, [currentPath]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const uploadFile = async (file: File) => {
    setError("");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("path", currentPath);
      const res = await fetch("/api/files", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "업로드에 실패했습니다.");
      }
      await fetchItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  };

  const handleDownload = (name: string) => {
    window.open(fileApiUrl(`${currentPath}${name}`), "_blank");
  };

  const handleDelete = async (item: FileItem) => {
    const label = item.type === "folder" ? "폴더" : "파일";
    if (!confirm(`"${item.name}" ${label}을(를) 삭제하시겠습니까?`)) return;
    setError("");
    try {
      const res = await fetch(fileApiUrl(`${currentPath}${item.name}`), {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      await fetchItems();
    } catch {
      setError("삭제에 실패했습니다.");
    }
  };

  const handleFolderClick = (folderName: string) => {
    setCurrentPath((prev) => `${prev}${folderName}/`);
  };

  const navigateTo = (pathIndex: number) => {
    const segments = currentPath.split("/").filter(Boolean);
    const newPath =
      pathIndex < 0 ? "" : segments.slice(0, pathIndex + 1).join("/") + "/";
    setCurrentPath(newPath);
  };

  const createFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    setError("");
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, path: currentPath }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "폴더 생성에 실패했습니다.");
      }
      setNewFolderName("");
      setShowNewFolder(false);
      await fetchItems();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "폴더 생성에 실패했습니다."
      );
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  const pathSegments = currentPath.split("/").filter(Boolean);
  const folders = items.filter((i) => i.type === "folder");
  const files = items.filter((i) => i.type === "file");

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                <polyline points="14,2 14,8 20,8"/>
              </svg>
            </div>
            <span className="text-sm font-semibold tracking-tight">
              {process.env.NEXT_PUBLIC_SITE_NAME ?? "TA Drive"}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="text-[13px] text-gray-400 hover:text-gray-600 transition cursor-pointer"
          >
            로그아웃
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 mb-6 text-[13px]">
          <button
            onClick={() => navigateTo(-1)}
            className={`hover:text-gray-800 transition cursor-pointer ${
              pathSegments.length === 0
                ? "text-gray-800 font-medium"
                : "text-gray-400"
            }`}
          >
            루트
          </button>
          {pathSegments.map((seg, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <span className="text-gray-200">/</span>
              <button
                onClick={() => navigateTo(i)}
                className={`hover:text-gray-800 transition cursor-pointer ${
                  i === pathSegments.length - 1
                    ? "text-gray-800 font-medium"
                    : "text-gray-400"
                }`}
              >
                {seg}
              </button>
            </span>
          ))}
        </nav>

        {/* Upload area */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`rounded-xl p-8 text-center cursor-pointer transition-all mb-6 ${
            dragOver
              ? "bg-gray-100 border-2 border-gray-300 border-dashed"
              : "bg-white border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:border-gray-200"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
          />
          {uploading ? (
            <div className="py-2">
              <div className="inline-block w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mb-3" />
              <p className="text-[13px] text-gray-400">업로드 중...</p>
            </div>
          ) : (
            <div className="py-2">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-50 mb-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17,8 12,3 7,8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <p className="text-[13px] text-gray-500">
                파일을 드래그하거나 <span className="text-gray-700 font-medium">클릭</span>하여 업로드
              </p>
              <p className="text-[11px] text-gray-300 mt-1.5">최대 50MB</p>
            </div>
          )}
        </div>

        {/* New folder */}
        <div className="mb-6">
          {showNewFolder ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") createFolder();
                  if (e.key === "Escape") {
                    setShowNewFolder(false);
                    setNewFolderName("");
                  }
                }}
                placeholder="폴더 이름"
                className="flex-1 px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200"
                autoFocus
              />
              <button
                onClick={createFolder}
                className="px-3 py-2 text-[13px] font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition cursor-pointer"
              >
                생성
              </button>
              <button
                onClick={() => {
                  setShowNewFolder(false);
                  setNewFolderName("");
                }}
                className="px-3 py-2 text-[13px] text-gray-400 hover:text-gray-600 transition cursor-pointer"
              >
                취소
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowNewFolder(true)}
              className="flex items-center gap-2 text-[13px] text-gray-400 hover:text-gray-600 transition cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              새 폴더
            </button>
          )}
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 bg-red-50 border border-red-100 rounded-lg">
            <p className="text-red-600 text-[13px]">{error}</p>
          </div>
        )}

        {/* Item list */}
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block w-5 h-5 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-gray-300">
              {currentPath ? "이 폴더는 비어 있습니다" : "업로드된 파일이 없습니다"}
            </p>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4 px-1">
              <h2 className="text-[13px] font-medium text-gray-400">
                {folders.length > 0 && `폴더 ${folders.length}개`}
                {folders.length > 0 && files.length > 0 && " · "}
                {files.length > 0 && `파일 ${files.length}개`}
              </h2>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden divide-y divide-gray-50">
              {/* Folders first */}
              {folders.map((folder) => (
                <div
                  key={`folder-${folder.name}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/50 transition group cursor-pointer"
                  onClick={() => handleFolderClick(folder.name)}
                >
                  {/* Folder icon */}
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-gray-800 truncate">
                      {folder.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(folder);
                      }}
                      className="p-2 rounded-lg hover:bg-red-50 transition cursor-pointer"
                      title="삭제"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3,6 5,6 21,6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}

              {/* Files */}
              {files.map((file) => (
                <div
                  key={`file-${file.name}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/50 transition group"
                >
                  {/* File icon */}
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#b0b0b0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                      <polyline points="14,2 14,8 20,8"/>
                    </svg>
                  </div>

                  {/* File info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-gray-800 truncate">
                      {file.name}
                    </p>
                    <p className="text-[11px] text-gray-300 mt-0.5">
                      {formatSize(file.size)} · {formatDate(file.createdAt)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleDownload(file.name)}
                      className="p-2 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                      title="다운로드"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7,10 12,15 17,10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(file)}
                      className="p-2 rounded-lg hover:bg-red-50 transition cursor-pointer"
                      title="삭제"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3,6 5,6 21,6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
