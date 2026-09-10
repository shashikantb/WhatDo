"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/components/design-system/Toaster";
import type { CreatePostInput } from "@/lib/validation/post.validation";

export function useCreatePost() {
  const router = useRouter();
  const toast = useToast();
  const { data: session } = useSession();

  const utils = trpc.useUtils();

  const createPostMutation = trpc.posts.create.useMutation({
    onSuccess: (data) => {
      utils.feed.getFeed.invalidate();
      utils.posts.getById.invalidate({ id: data.id });
      toast.show("Post published successfully!", "success");
      router.push(`/post/${data.slug ?? data.id}`);
    },
    onError: (error) => {
      const message =
        error?.data?.code === "TOO_MANY_REQUESTS"
          ? "You're creating posts too fast. Please wait a moment."
          : error?.message || "Failed to create post. Please try again.";
      toast.show(message, "danger");
    },
  });

  const requestPresignedUploadMutation =
    trpc.media.requestPresignedUpload.useMutation({
      onError: (error) => {
        toast.show(
          error?.message || "Failed to prepare upload. Please try again.",
          "danger"
        );
      },
    });

  const createPost = React.useCallback(
    async (input: CreatePostInput) => {
      if (!session?.user?.id) {
        toast.show("Please log in to create a post", "warning");
        router.push("/login");
        return null;
      }
      return createPostMutation.mutateAsync(input);
    },
    [session, createPostMutation, toast, router]
  );

  const requestPresignedUpload = React.useCallback(
    async (input: {
      type: "image" | "video" | "gif";
      contentType: string;
      fileSize: number;
      fileName: string;
    }) => {
      if (!session?.user?.id) {
        toast.show("Please log in to upload media", "warning");
        router.push("/login");
        return null;
      }
      return requestPresignedUploadMutation.mutateAsync(input);
    },
    [session, requestPresignedUploadMutation, toast, router]
  );

  return {
    createPost,
    requestPresignedUpload,
    isCreating: createPostMutation.isPending,
    isRequestingUpload: requestPresignedUploadMutation.isPending,
    createError: createPostMutation.error,
    uploadError: requestPresignedUploadMutation.error,
    reset: () => {
      createPostMutation.reset();
      requestPresignedUploadMutation.reset();
    },
  };
}
