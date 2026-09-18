"use client";

import * as React from "react";
import {
  UploadCloud,
  X,
  FileImage,
  Film,
  ImageIcon,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/design-system/Toaster";
import { ProgressBar } from "@/components/design-system/ProgressBar";
import { Button } from "@/components/design-system/Button";
import { trpc } from "@/lib/trpc/client";
import { PostMediaTypeEnum } from "@/lib/validation/post.validation";
import type { z } from "zod";

export type PostMediaType = z.infer<typeof PostMediaTypeEnum>;

export interface PostMediaInput {
  type: PostMediaType;
  url: string;
  thumbnailUrl?: string;
  posterUrl?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  duration?: number;
  fileSize?: number;
  sortOrder: number;
}

interface InternalMediaItem {
  id: string;
  file?: File;
  name: string;
  size: number;
  type: PostMediaType;
  mimeType: string;
  previewUrl?: string;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
  sortOrder: number;
  width?: number;
  height?: number;
  duration?: number;
  thumbnailUrl?: string;
  posterUrl?: string;
  finalUrl?: string;
}

export interface MediaUploaderProps {
  value: PostMediaInput[];
  onChange: (items: PostMediaInput[]) => void;
}

const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/jpg",
];
const ACCEPTED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
];
const MAX_FILES = 10;
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getMediaType(mimeType: string): PostMediaType | null {
  if (mimeType === "image/gif") return "GIF";
  if (ACCEPTED_IMAGE_TYPES.includes(mimeType)) return "IMAGE";
  if (ACCEPTED_VIDEO_TYPES.includes(mimeType)) return "VIDEO";
  return null;
}

async function uploadFileWithProgress(
  presignedUrl: string,
  file: File | Blob,
  contentType: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        if (onProgress) onProgress(100);
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Network error during upload"));
    });

    xhr.addEventListener("abort", () => {
      reject(new Error("Upload aborted"));
    });

    xhr.open("PUT", presignedUrl, true);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.send(file);
  });
}

async function generateImageThumbnail(
  file: File,
  maxWidth = 400,
  maxHeight = 400
): Promise<{ dataUrl: string; blob: Blob; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image"));
      img.onload = () => {
        let { naturalWidth: w, naturalHeight: h } = img;
        const ratio = Math.min(maxWidth / w, maxHeight / h);
        const tw = Math.round(w * ratio);
        const th = Math.round(h * ratio);

        const canvas = document.createElement("canvas");
        canvas.width = tw;
        canvas.height = th;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }
        ctx.drawImage(img, 0, 0, tw, th);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({
                dataUrl,
                blob,
                width: w,
                height: h,
              });
            } else {
              reject(new Error("Failed to create thumbnail blob"));
            }
          },
          "image/jpeg",
          0.8
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

async function captureVideoPoster(
  file: File
): Promise<{ blob: Blob; dataUrl: string; width: number; height: number; duration: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const url = URL.createObjectURL(file);
    video.src = url;

    const cleanup = () => {
      URL.revokeObjectURL(url);
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("Failed to load video"));
    };

    video.onloadedmetadata = () => {
      video.currentTime = Math.min(0.1, video.duration || 0.1);
    };

    video.onseeked = () => {
      const w = video.videoWidth;
      const h = video.videoHeight;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        cleanup();
        reject(new Error("Failed to get canvas context"));
        return;
      }
      ctx.drawImage(video, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      canvas.toBlob(
        (blob) => {
          cleanup();
          if (blob) {
            resolve({
              blob,
              dataUrl,
              width: w,
              height: h,
              duration: video.duration,
            });
          } else {
            reject(new Error("Failed to create poster blob"));
          }
        },
        "image/jpeg",
        0.8
      );
    };
  });
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({
  value,
  onChange,
}) => {
  const toast = useToast();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [demoMode, setDemoMode] = React.useState(false);
  const requestPresignedUpload = trpc.media.requestPresignedUpload.useMutation();

  const [internalItems, setInternalItems] = React.useState<InternalMediaItem[]>(
    () =>
      value.map((m, idx) => ({
        id: `existing-${idx}-${Math.random().toString(36).slice(2, 8)}`,
        name: `media-${idx + 1}`,
        size: m.fileSize ?? 0,
        type: m.type,
        mimeType: m.mimeType ?? "",
        progress: 100,
        status: "success" as const,
        sortOrder: m.sortOrder,
        width: m.width,
        height: m.height,
        duration: m.duration,
        thumbnailUrl: m.thumbnailUrl,
        posterUrl: m.posterUrl,
        finalUrl: m.url,
        previewUrl: m.url,
      }))
  );

  const syncToParent = React.useCallback(
    (items: InternalMediaItem[]) => {
      const valid = items
        .filter((i) => i.status === "success" && i.finalUrl)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((i) => ({
          type: i.type,
          url: i.finalUrl!,
          thumbnailUrl: i.thumbnailUrl,
          posterUrl: i.posterUrl,
          mimeType: i.mimeType || undefined,
          width: i.width,
          height: i.height,
          duration: i.duration,
          fileSize: i.size || undefined,
          sortOrder: i.sortOrder,
        }));
      onChange(valid);
    },
    [onChange]
  );

  const updateItem = React.useCallback(
    (id: string, updates: Partial<InternalMediaItem>) => {
      setInternalItems((prev) => {
        const next = prev.map((f) => (f.id === id ? { ...f, ...updates } : f));
        if (updates.status === "success") {
          syncToParent(next);
        }
        return next;
      });
    },
    [syncToParent]
  );

  const removeItem = React.useCallback(
    (id: string) => {
      setInternalItems((prev) => {
        const file = prev.find((f) => f.id === id);
        if (file?.previewUrl && file.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(file.previewUrl);
        }
        const next = prev
          .filter((f) => f.id !== id)
          .map((f, i) => ({ ...f, sortOrder: i }));
        syncToParent(next);
        return next;
      });
    },
    [syncToParent]
  );

  const moveItem = React.useCallback(
    (id: string, direction: -1 | 1) => {
      setInternalItems((prev) => {
        const idx = prev.findIndex((i) => i.id === id);
        if (idx === -1) return prev;
        const newIdx = idx + direction;
        if (newIdx < 0 || newIdx >= prev.length) return prev;
        const next = [...prev];
        [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
        const reordered = next.map((n, i) => ({ ...n, sortOrder: i }));
        syncToParent(reordered);
        return reordered;
      });
    },
    [syncToParent]
  );

  const uploadAndProcessItem = React.useCallback(
    async (item: InternalMediaItem) => {
      if (!item.file) return;

      updateItem(item.id, { status: "uploading", progress: 0 });

      try {
        const mediaTypeForPresign = item.type.toLowerCase() as
          | "image"
          | "video"
          | "gif";

        let finalUrl: string = "";
        let thumbnailUrl: string | undefined = undefined;
        let posterUrl: string | undefined = undefined;
        let width: number | undefined = item.width;
        let height: number | undefined = item.height;
        let duration: number | undefined = item.duration;

        const tryRealUpload = async (
          fileArg: File | Blob,
          ct: string,
          fs: number,
          fn: string
        ): Promise<string | null> => {
          try {
            const result = await requestPresignedUpload.mutateAsync({
              type: mediaTypeForPresign === "gif" ? "image" : mediaTypeForPresign,
              contentType: ct,
              fileSize: fs,
              fileName: fn,
            });
            if (result?.uploadUrl) {
              await uploadFileWithProgress(
                result.uploadUrl,
                fileArg,
                ct,
                (p) => {
                  if (fileArg === item.file) {
                    updateItem(item.id, { progress: Math.max(1, Math.floor(p * 0.9)) });
                  }
                }
              );
              return result.publicUrl ?? result.uploadUrl.split("?")[0];
            }
            return null;
          } catch {
            return "__DEMO__";
          }
        };

        const objectUrl = (): string => {
          if (!demoMode) {
            setDemoMode(true);
            toast.show(
              "Demo mode: media not persisted. Configure R2/S3 for production uploads.",
              "warning"
            );
          }
          if (item.previewUrl) return item.previewUrl;
          return URL.createObjectURL(item.file!);
        };

        if ((item.type === "IMAGE" || item.type === "GIF") && item.file) {
          try {
            const thumb = await generateImageThumbnail(item.file);
            width = thumb.width;
            height = thumb.height;
            const uploaded = await tryRealUpload(
              item.file,
              item.mimeType,
              item.size,
              item.name
            );
            if (uploaded === "__DEMO__") {
              finalUrl = objectUrl();
              thumbnailUrl = thumb.dataUrl;
            } else if (uploaded) {
              finalUrl = uploaded;
              const thumbUploaded = await tryRealUpload(
                thumb.blob,
                "image/jpeg",
                thumb.blob.size,
                `thumb-${item.name}`
              );
              thumbnailUrl =
                thumbUploaded && thumbUploaded !== "__DEMO__"
                  ? thumbUploaded
                  : thumb.dataUrl;
            } else {
              throw new Error("Failed to get upload URL");
            }
          } catch {
            finalUrl = objectUrl();
          }
        } else if (item.type === "VIDEO" && item.file) {
          try {
            const poster = await captureVideoPoster(item.file);
            width = poster.width;
            height = poster.height;
            duration = poster.duration;
            const uploaded = await tryRealUpload(
              item.file,
              item.mimeType,
              item.size,
              item.name
            );
            if (uploaded === "__DEMO__") {
              finalUrl = objectUrl();
              posterUrl = poster.dataUrl;
            } else if (uploaded) {
              finalUrl = uploaded;
              const posterUploaded = await tryRealUpload(
                poster.blob,
                "image/jpeg",
                poster.blob.size,
                `poster-${item.name}`
              );
              posterUrl =
                posterUploaded && posterUploaded !== "__DEMO__"
                  ? posterUploaded
                  : poster.dataUrl;
            } else {
              throw new Error("Failed to get upload URL");
            }
          } catch {
            finalUrl = objectUrl();
          }
        }

        updateItem(item.id, {
          status: "success",
          progress: 100,
          finalUrl,
          thumbnailUrl,
          posterUrl,
          width,
          height,
          duration,
          file: undefined,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Upload failed";
        updateItem(item.id, {
          status: "error",
          error: message,
        });
        toast.show(`Failed to upload ${item.name}: ${message}`, "danger");
      }
    },
    [demoMode, requestPresignedUpload, toast, updateItem]
  );

  const validateAndAddFiles = React.useCallback(
    async (fileList: FileList | File[]) => {
      const newFiles = Array.from(fileList);

      for (const rawFile of newFiles) {
        if (internalItems.length >= MAX_FILES) {
          toast.show(
            `Maximum ${MAX_FILES} files allowed. Some files were skipped.`,
            "warning"
          );
          break;
        }

        const mediaType = getMediaType(rawFile.type);
        if (!mediaType) {
          toast.show(
            `Unsupported file type: ${rawFile.name}. Only images, GIFs, and videos are allowed.`,
            "danger"
          );
          continue;
        }

        const maxSizeBytes =
          mediaType === "VIDEO" ? MAX_VIDEO_SIZE_BYTES : MAX_IMAGE_SIZE_BYTES;
        const maxSizeLabel =
          mediaType === "VIDEO" ? "100MB" : "10MB";

        if (rawFile.size > maxSizeBytes) {
          toast.show(
            `File too large: ${rawFile.name}. Maximum size is ${maxSizeLabel}.`,
            "danger"
          );
          continue;
        }

        const id = `media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const previewUrl =
          mediaType !== "VIDEO"
            ? URL.createObjectURL(rawFile)
            : URL.createObjectURL(rawFile);

        const newItem: InternalMediaItem = {
          id,
          file: rawFile,
          name: rawFile.name,
          size: rawFile.size,
          type: mediaType,
          mimeType: rawFile.type,
          previewUrl,
          progress: 0,
          status: "pending",
          sortOrder: internalItems.length,
        };

        setInternalItems((prev) => [...prev, newItem]);
        void uploadAndProcessItem(newItem);
      }
    },
    [internalItems.length, toast, uploadAndProcessItem]
  );

  const handleDrop = React.useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        void validateAndAddFiles(e.dataTransfer.files);
      }
    },
    [validateAndAddFiles]
  );

  const handleDragOver = React.useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    },
    []
  );

  const handleDragLeave = React.useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    },
    []
  );

  const handleFileInput = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        void validateAndAddFiles(e.target.files);
        e.target.value = "";
      }
    },
    [validateAndAddFiles]
  );

  return (
    <div className="space-y-4 w-full">
      <div
        onClick={() =>
          internalItems.length < MAX_FILES && inputRef.current?.click()
        }
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "relative border-2 border-dashed rounded-2xl p-6 md:p-10 transition-all duration-200",
          "text-center cursor-pointer select-none",
          isDragging
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border hover:border-primary/50 hover:bg-muted/30",
          internalItems.length >= MAX_FILES &&
            "opacity-50 cursor-not-allowed pointer-events-none"
        )}
        role="button"
        tabIndex={0}
      >
        <input
          ref={inputRef}
          type="file"
          accept={[
            ...ACCEPTED_IMAGE_TYPES,
            ...ACCEPTED_VIDEO_TYPES,
            "image/gif",
          ].join(",")}
          multiple
          onChange={handleFileInput}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-3">
          <div
            className={cn(
              "h-14 w-14 md:h-16 md:w-16 rounded-2xl flex items-center justify-center transition-colors",
              isDragging
                ? "bg-primary/15 text-primary"
                : "bg-muted text-muted-foreground"
            )}
          >
            <UploadCloud
              className="h-7 w-7 md:h-8 md:w-8"
              strokeWidth={1.5}
            />
          </div>
          <div className="space-y-1">
            <p className="text-base md:text-lg font-semibold text-foreground">
              {isDragging ? "Drop files here" : "Click or drag & drop"}
            </p>
            <p className="text-sm text-muted-foreground">
              Images, GIFs, or videos · Max {MAX_FILES} files ·{" "}
              <span className="text-xs">
                Image ≤ 10MB · Video ≤ 100MB
              </span>
            </p>
          </div>
        </div>
      </div>

      {internalItems.length > 0 && (
        <div className="space-y-2">
          {internalItems
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((file, idx) => (
              <div
                key={file.id}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl border p-2.5 transition-all",
                  file.status === "error"
                    ? "border-danger bg-danger/5"
                    : "border-border bg-card"
                )}
              >
                <div className="flex flex-col gap-0.5 opacity-50 cursor-grab">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-muted relative">
                  {file.previewUrl &&
                  (file.type === "IMAGE" || file.type === "GIF") ? (
                    <img
                      src={file.previewUrl}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : file.type === "VIDEO" ? (
                    file.posterUrl ? (
                      <img
                        src={file.posterUrl}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Film className="h-7 w-7" strokeWidth={1.5} />
                      </div>
                    )
                  ) : file.type === "GIF" ? (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-7 w-7" strokeWidth={1.5} />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <FileImage className="h-7 w-7" strokeWidth={1.5} />
                    </div>
                  )}

                  {file.status === "uploading" && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center px-2">
                      <div className="w-full">
                        <ProgressBar
                          value={file.progress}
                          color="primary"
                          size="sm"
                          showLabel
                          labelPosition="inside"
                        />
                      </div>
                    </div>
                  )}

                  {file.status === "error" && (
                    <div className="absolute inset-0 bg-danger/20 flex items-center justify-center px-1.5">
                      <div className="flex items-center gap-1 text-danger text-[10px] font-medium">
                        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">Failed</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <p
                    className="text-xs font-semibold text-foreground truncate"
                    title={file.name}
                  >
                    {file.name}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{formatFileSize(file.size)}</span>
                    <span>·</span>
                    <span className="uppercase tracking-wide">
                      {file.type.toLowerCase()}
                    </span>
                    {file.width && file.height && (
                      <>
                        <span>·</span>
                        <span>
                          {file.width}×{file.height}
                        </span>
                      </>
                    )}
                  </div>
                  {file.status === "error" && file.error && (
                    <p className="text-[10px] text-danger truncate">
                      {file.error}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => moveItem(file.id, -1)}
                    disabled={idx === 0}
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Move up"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => moveItem(file.id, 1)}
                    disabled={idx === internalItems.length - 1}
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Move down"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeItem(file.id);
                  }}
                  className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};
