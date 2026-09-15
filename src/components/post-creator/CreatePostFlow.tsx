"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useForm, Controller, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ChevronDown,
  ChevronUp,
  Save,
  Send,
  Image as ImageIcon,
  HelpCircle,
  Sparkles,
  ListFilter,
  Settings as SettingsIcon,
  Eye,
  Tags,
  Clock,
  EyeOff,
  MessageSquare,
  X,
  Plus,
  AlertCircle,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/components/design-system/Toaster";
import { Button } from "@/components/design-system/Button";
import { Card, CardContent } from "@/components/design-system/Card";
import { Textarea } from "@/components/design-system/Textarea";
import { Select } from "@/components/design-system/Select";
import { Badge } from "@/components/design-system/Badge";
import { Skeleton } from "@/components/design-system/Skeleton";
import { createPostSchema, getDefaultOptionsForType, type CreatePostInput, PostTypeEnum } from "@/lib/validation/post.validation";
import { MediaUploader, type PostMediaInput } from "./MediaUploader";
import {
  OpinionTypePicker,
  OPINION_TYPES,
  type OpinionTypeValue,
} from "./OpinionTypePicker";
import { OptionsEditor, type PostOptionInput } from "./OptionsEditor";
import { PostPreview, type PreviewDraftState } from "./PostPreview";

type ZodPostType = z.infer<typeof PostTypeEnum>;

const DRAFT_STORAGE_KEY = "whatdo:post-draft:v1";

const VOTING_DURATIONS = [
  { value: "", label: "No expiration" },
  { value: "24h", label: "24 hours" },
  { value: "3d", label: "3 days" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
];

function addDuration(choice: string): Date | undefined {
  if (!choice) return undefined;
  const now = Date.now();
  switch (choice) {
    case "24h":
      return new Date(now + 24 * 60 * 60 * 1000);
    case "3d":
      return new Date(now + 3 * 24 * 60 * 60 * 1000);
    case "7d":
      return new Date(now + 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now + 30 * 24 * 60 * 60 * 1000);
    default:
      return undefined;
  }
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  valid?: boolean;
  hasContent?: boolean;
}

const Section: React.FC<SectionProps> = ({
  title,
  icon,
  badge,
  children,
  defaultOpen = true,
  className,
  valid,
  hasContent,
}) => {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <Card className={cn("overflow-hidden transition-shadow", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-4 md:p-5 hover:bg-muted/30 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              "flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center",
              valid
                ? "bg-success/15 text-success"
                : hasContent
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground"
            )}
          >
            {valid ? <CheckCircle2 className="h-5 w-5" /> : icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm md:text-base text-foreground">
                {title}
              </h3>
              {badge}
            </div>
          </div>
        </div>
        <div className="flex-shrink-0 ml-2">
          {open ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </button>
      {open && (
        <div className="border-t border-border">
          <div className="p-4 md:p-5 pt-4 md:pt-4">{children}</div>
        </div>
      )}
    </Card>
  );
};

export interface CreatePostFlowProps {
  onPublished?: (postId: string, postSlug?: string) => void;
  defaultType?: OpinionTypeValue;
}

export const CreatePostFlow: React.FC<CreatePostFlowProps> = ({
  onPublished,
  defaultType = "YES_NO",
}) => {
  const router = useRouter();
  const { data: session } = useSession();
  const toast = useToast();
  const utils = trpc.useUtils();

  const createPost = trpc.posts.create.useMutation();
  const categoriesQuery = trpc.categories.listAll.useQuery(undefined, {
    staleTime: 60_000,
  });

  const methods = useForm<CreatePostInput>({
    resolver: zodResolver(createPostSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      question: "",
      type: defaultType as ZodPostType,
      categoryId: undefined as string | undefined,
      isAnonymous: false,
      allowComments: true,
      tags: [] as string[],
      options: getDefaultOptionsForType(defaultType),
      media: [] as PostMediaInput[],
      expiresAt: undefined as Date | undefined,
      anonymous: false,
    },
  });

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    setError,
    clearErrors,
    reset,
    formState: { errors, isSubmitting, isValid, dirtyFields },
    getValues,
  } = methods;

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<CreatePostInput> & {
          expiresAt?: string;
        };
        const defaults = getValues();
        const merged: CreatePostInput = {
          ...defaults,
          ...parsed,
          expiresAt: parsed.expiresAt
            ? new Date(parsed.expiresAt)
            : undefined,
          options:
            parsed.options?.length && parsed.options.length >= 2
              ? (parsed.options as PostOptionInput[])
              : defaults.options,
          tags: Array.isArray(parsed.tags) ? parsed.tags : [],
          media: Array.isArray(parsed.media) ? parsed.media : [],
          question: typeof parsed.question === "string" ? parsed.question : "",
          isAnonymous: typeof parsed.isAnonymous === "boolean" ? parsed.isAnonymous : false,
          allowComments: typeof parsed.allowComments === "boolean" ? parsed.allowComments : true,
        } as CreatePostInput;
        reset(merged, { keepDefaultValues: false, keepDirty: false, keepTouched: false, keepIsSubmitted: true });
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const watchedQuestion = watch("question") ?? "";
  const watchedType = watch("type") as OpinionTypeValue;
  const watchedCategoryId = watch("categoryId");
  const watchedOptions = (watch("options") as PostOptionInput[] | undefined) ?? [];
  const watchedMedia = (watch("media") as PostMediaInput[] | undefined) ?? [];
  const watchedTags = (watch("tags") as string[] | undefined) ?? [];
  const watchedAnonymous = watch("isAnonymous") ?? false;
  const watchedAllowComments = watch("allowComments") ?? true;
  const watchedExpiresAt = watch("expiresAt") as Date | undefined;

  const [durationChoice, setDurationChoice] = React.useState<string>("");
  const [tagInput, setTagInput] = React.useState("");
  const [draftSavedTs, setDraftSavedTs] = React.useState<number | null>(null);

  const categoryObj = React.useMemo(() => {
    if (!watchedCategoryId || !categoriesQuery.data) return null;
    const match = categoriesQuery.data.find((c) => c.id === watchedCategoryId);
    return match
      ? {
          id: match.id,
          name: match.name,
          color: undefined,
        }
      : null;
  }, [watchedCategoryId, categoriesQuery.data]);

  React.useEffect(() => {
    const safeType = watchedType ?? "YES_NO";
    const currentOpts = watchedOptions ?? [];
    let min = 2;
    let max = 10;
    switch (safeType) {
      case "YES_NO":
      case "A_VS_B":
      case "PREDICTION":
        min = 2;
        max = 2;
        break;
      case "DECISION":
        min = 3;
        max = 3;
        break;
      case "RATING":
        min = 10;
        max = 10;
        break;
      case "EMOJI":
        min = 2;
        max = 8;
        break;
      case "PRICE":
        min = 2;
        max = 6;
        break;
      case "MULTIPLE_CHOICE":
      case "POLL":
      default:
        min = 2;
        max = 10;
    }
    const defaults = getDefaultOptionsForType(safeType);
    if (
      currentOpts.length < min ||
      currentOpts.length > max ||
      (currentOpts.length === defaults.length &&
        safeType === "RATING" &&
        currentOpts[0]?.label !== "1")
    ) {
      setValue("options", defaults as any, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [watchedType]);

  const saveDraft = React.useCallback(() => {
    try {
      const v = getValues();
      const serializable = {
        ...v,
        expiresAt: v.expiresAt ? new Date(v.expiresAt).toISOString() : undefined,
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(serializable));
      setDraftSavedTs(Date.now());
      toast.show("Draft saved", "success");
    } catch {
      toast.show("Could not save draft locally", "warning");
    }
  }, [getValues, toast]);

  const clearDraft = React.useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const handleTypeChange = React.useCallback(
    (t: OpinionTypeValue) => {
      clearErrors("type");
      setValue("type", t as ZodPostType, {
        shouldDirty: true,
        shouldValidate: true,
      });
      const defaults = getDefaultOptionsForType(t);
      setValue("options", defaults as any, {
        shouldDirty: true,
        shouldValidate: true,
      });
    },
    [setValue, clearErrors]
  );

  const handleOptionsChange = React.useCallback(
    (next: PostOptionInput[]) => {
      setValue(
        "options",
        next.map((o, i) => ({ ...o, sortOrder: o.sortOrder ?? i })) as any,
        { shouldDirty: true, shouldValidate: true }
      );
    },
    [setValue]
  );

  const handleMediaChange = React.useCallback(
    (items: PostMediaInput[]) => {
      setValue("media", items as any, {
        shouldDirty: true,
        shouldValidate: true,
      });
    },
    [setValue]
  );

  const addTag = React.useCallback(() => {
    const val = tagInput.trim().toLowerCase();
    if (!val) return;
    if (watchedTags.length >= 10) {
      toast.show("Maximum 10 tags allowed", "warning");
      return;
    }
    if (val.length > 30) {
      toast.show("Tag must be 30 characters or less", "warning");
      return;
    }
    if (watchedTags.includes(val)) {
      setTagInput("");
      return;
    }
    setValue("tags", [...watchedTags, val], {
      shouldDirty: true,
      shouldValidate: true,
    });
    setTagInput("");
  }, [tagInput, watchedTags, setValue, toast]);

  const removeTag = React.useCallback(
    (t: string) => {
      setValue(
        "tags",
        watchedTags.filter((x) => x !== t),
        { shouldDirty: true, shouldValidate: true }
      );
    },
    [watchedTags, setValue]
  );

  const handleDurationChange = React.useCallback(
    (val: string) => {
      setDurationChoice(val);
      const expiresAt = addDuration(val);
      setValue("expiresAt", expiresAt as any, {
        shouldDirty: true,
        shouldValidate: true,
      });
    },
    [setValue]
  );

  const onSubmit = handleSubmit(async (data) => {
    try {
      const payload: CreatePostInput = {
        ...data,
        anonymous: data.isAnonymous || data.anonymous,
      };
      const result = await createPost.mutateAsync(payload);
      clearDraft();
      if (result.status === "PENDING_MODERATION") {
        toast.show(
          "Under review. You'll be notified when live.",
          "info"
        );
      } else {
        toast.show("Your question is live! 🎉", "success");
      }
      utils.feed.getFeed.invalidate();
      utils.posts.getById.invalidate({ id: result.id });
      const target = result.id ? `/post/${result.id}` : "/feed";
      onPublished?.(result.id, result.slug);
      router.push(target);
      reset();
    } catch (err: any) {
      const issues: Array<{ path: (string | number)[]; message: string }> =
        err?.data?.zodError?.fieldErrors
          ? Object.entries(err.data.zodError.fieldErrors).flatMap(
              ([k, vs]) =>
                (vs as string[]).map((m) => ({
                  path: [k],
                  message: m,
                }))
            )
          : err?.data?.issues ?? [];
      if (issues.length) {
        issues.forEach((issue) => {
          const name = issue.path.join(".") as any;
          if (name) {
            setError(name, {
              type: "server",
              message: issue.message,
            });
          }
        });
        toast.show(
          "Please fix the highlighted fields before publishing.",
          "danger"
        );
      } else {
        const message =
          err?.data?.code === "TOO_MANY_REQUESTS"
            ? "You're creating posts too fast. Please wait a moment."
            : err?.message || "Failed to publish. Please try again.";
        toast.show(message, "danger");
      }
    }
  });

  const sectionMediaValid = watchedMedia.length >= 0 && !errors.media;
  const sectionQuestionValid =
    watchedQuestion.length >= 10 && watchedQuestion.length <= 500;
  const sectionOptionsValid =
    watchedOptions.length >= 2 &&
    watchedOptions.every((o) => o.label && o.label.length <= 60);
  const sectionTagsValid = watchedTags.length <= 10;

  const previewDraft: PreviewDraftState = {
    question: watchedQuestion,
    postType: watchedType,
    options: watchedOptions,
    media: watchedMedia,
    category: categoryObj,
    isAnonymous: watchedAnonymous,
    allowComments: watchedAllowComments,
    tags: watchedTags,
    expiresAt: watchedExpiresAt ?? null,
    currentUser: session?.user
      ? {
          displayName: (session.user as any).name ?? null,
          username: (session.user as any).username ?? null,
          avatarUrl: (session.user as any).image ?? (session.user as any).avatarUrl ?? null,
        }
      : null,
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={onSubmit} className="w-full">
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-5 md:gap-6 w-full">
          <div className="xl:col-span-3 space-y-4 md:space-y-5 w-full min-w-0">
            <Section
              title="Media"
              icon={<ImageIcon className="h-5 w-5" />}
              badge={
                watchedMedia.length > 0 ? (
                  <Badge size="sm" variant="info">
                    {watchedMedia.length}/10
                  </Badge>
                ) : undefined
              }
              valid={sectionMediaValid && watchedMedia.length > 0}
              hasContent={watchedMedia.length > 0}
              defaultOpen={true}
            >
              <Controller
                name="media"
                control={control}
                render={() => (
                  <div>
                    <MediaUploader
                      value={watchedMedia}
                      onChange={handleMediaChange}
                    />
                    {errors.media && (
                      <p className="mt-2 text-xs text-danger flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {(errors.media as any)?.message ||
                          "Media validation failed"}
                      </p>
                    )}
                  </div>
                )}
              />
            </Section>

            <Section
              title="Your Question"
              icon={<HelpCircle className="h-5 w-5" />}
              badge={
                <span
                  className={cn(
                    "text-[11px] font-semibold tabular-nums",
                    watchedQuestion.length > 500
                      ? "text-danger"
                      : watchedQuestion.length >= 10
                        ? "text-success"
                        : "text-muted-foreground"
                  )}
                >
                  {watchedQuestion.length}/500
                </span>
              }
              valid={sectionQuestionValid}
              hasContent={watchedQuestion.length > 0}
              defaultOpen={true}
            >
              <Controller
                name="question"
                control={control}
                render={({ field }) => (
                  <div>
                    <Textarea
                      {...field}
                      rows={4}
                      size="lg"
                      placeholder="What do you want to ask people?"
                      variant={errors.question ? "error" : "default"}
                      helperText={
                        errors.question?.message ||
                        "Minimum 10 characters. Ask something that invites opinions."
                      }
                    />
                  </div>
                )}
              />
            </Section>

            <Section
              title="Opinion Type"
              icon={<Sparkles className="h-5 w-5" />}
              badge={
                <Badge
                  size="sm"
                  variant="category"
                  className="font-semibold"
                >
                  {OPINION_TYPES.find((t) => t.value === watchedType)?.label ??
                    "Select"}
                </Badge>
              }
              valid={!!watchedType && !errors.type}
              hasContent={true}
              defaultOpen={true}
            >
              <Controller
                name="type"
                control={control}
                render={() => (
                  <OpinionTypePicker
                    value={watchedType ?? null}
                    onChange={handleTypeChange}
                  />
                )}
              />
            </Section>

            <Section
              title="Options"
              icon={<ListFilter className="h-5 w-5" />}
              badge={
                <Badge size="sm" variant="info">
                  {watchedOptions.length} items
                </Badge>
              }
              valid={sectionOptionsValid}
              hasContent={watchedOptions.length >= 2}
              defaultOpen={true}
            >
              <Controller
                name="options"
                control={control}
                render={() => (
                  <div>
                    <OptionsEditor
                      opinionType={watchedType ?? "YES_NO"}
                      options={watchedOptions}
                      onChange={handleOptionsChange}
                      expiresAt={watchedExpiresAt}
                      onExpiresAtChange={(d) =>
                        setValue("expiresAt", d as any, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                    />
                    {errors.options && (
                      <p className="mt-2 text-xs text-danger flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {Array.isArray((errors.options as any)?.message)
                          ? "Please fix the options above."
                          : (errors.options as any)?.message ||
                            "Options validation failed"}
                      </p>
                    )}
                  </div>
                )}
              />
            </Section>

            <Section
              title="Category"
              icon={<ListFilter className="h-5 w-5" />}
              valid={!!watchedCategoryId}
              hasContent={!!watchedCategoryId}
              defaultOpen={true}
            >
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) =>
                  categoriesQuery.isLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-10 w-full rounded-lg" />
                    </div>
                  ) : categoriesQuery.error ? (
                    <Select
                      label="Category"
                      placeholder="Couldn't load categories"
                      value={field.value ?? ""}
                      onChange={(v) => field.onChange(v)}
                      options={[]}
                      error
                    />
                  ) : (
                    <Select
                      label="Category"
                      placeholder="Pick a category (recommended)"
                      value={field.value ?? ""}
                      onChange={(v) => field.onChange(v)}
                      options={
                        categoriesQuery.data?.map((c: any) => ({
                          value: c.id,
                          label: c.name,
                        })) ?? []
                      }
                      error={!!errors.categoryId}
                      helperText={
                        errors.categoryId?.message
                          ? String(errors.categoryId.message)
                          : "Helps your post reach interested people"
                      }
                    />
                  )
                }
              />
            </Section>

            <Section
              title="Tags"
              icon={<Tags className="h-5 w-5" />}
              badge={
                <span
                  className={cn(
                    "text-[11px] font-semibold tabular-nums",
                    watchedTags.length >= 10
                      ? "text-warning"
                      : "text-muted-foreground"
                  )}
                >
                  {watchedTags.length}/10
                </span>
              }
              valid={sectionTagsValid}
              hasContent={watchedTags.length > 0}
              defaultOpen={false}
            >
              <div className="space-y-3 w-full">
                {watchedTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {watchedTags.map((t) => (
                      <Badge
                        key={t}
                        variant="category"
                        size="md"
                        className="group gap-1.5"
                      >
                        #{t}
                        <button
                          type="button"
                          onClick={() => removeTag(t)}
                          className="ml-0.5 h-4 w-4 inline-flex items-center justify-center rounded-full hover:bg-foreground/10 transition-colors"
                          aria-label={`Remove tag ${t}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <InputImpl
                    placeholder="Add tag, press Enter or comma"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    disabled={watchedTags.length >= 10}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addTag}
                    disabled={
                      watchedTags.length >= 10 || !tagInput.trim()
                    }
                    leftIcon={<Plus className="h-4 w-4" />}
                  >
                    Add
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Press Enter or comma to add · Lowercase automatically · Max 30
                  chars each
                </p>
                {errors.tags && (
                  <p className="text-xs text-danger flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {(errors.tags as any)?.message || "Tags invalid"}
                  </p>
                )}
              </div>
            </Section>

            <Section
              title="Settings"
              icon={<SettingsIcon className="h-5 w-5" />}
              defaultOpen={false}
              className=""
            >
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-4 rounded-xl border border-border p-4 bg-card">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                      <EyeOff className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-foreground">
                        Post anonymously
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Your profile won&apos;t be shown on this post.
                      </p>
                    </div>
                  </div>
                  <Controller
                    name="isAnonymous"
                    control={control}
                    render={({ field }) => (
                      <ToggleSwitch
                        checked={!!field.value}
                        onChange={(v) => {
                          field.onChange(v);
                          setValue("anonymous", v, { shouldDirty: true });
                        }}
                      />
                    )}
                  />
                </div>

                <div className="flex items-start justify-between gap-4 rounded-xl border border-border p-4 bg-card">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-foreground">
                        Allow comments
                      </p>
                      <p className="text-xs text-muted-foreground">
                        People can add their thoughts and reply to this post.
                      </p>
                    </div>
                  </div>
                  <Controller
                    name="allowComments"
                    control={control}
                    render={({ field }) => (
                      <ToggleSwitch
                        checked={!!field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Voting duration
                  </label>
                  <Select
                    placeholder="No expiration"
                    options={VOTING_DURATIONS}
                    value={durationChoice}
                    onChange={handleDurationChange}
                    helperText={
                      watchedExpiresAt
                        ? `Voting closes on ${new Date(watchedExpiresAt).toLocaleString()}`
                        : "Votes will remain open indefinitely."
                    }
                  />
                </div>
              </div>
            </Section>

            <Section
              title="Preview"
              icon={<Eye className="h-5 w-5" />}
              defaultOpen={true}
            >
              <PostPreview draft={previewDraft} />
            </Section>
          </div>

          <div className="xl:col-span-2 w-full min-w-0">
            <div className="xl:sticky xl:top-20 space-y-4">
              <Card className="overflow-hidden">
                <div className="p-4 md:p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-base md:text-lg text-foreground">
                        Ready to publish?
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {isValid
                          ? "All checks passed — post will be live immediately."
                          : "Fill in the required sections above."}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center",
                        isValid
                          ? "bg-success/15 text-success"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {isValid ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <AlertCircle className="h-5 w-5" />
                      )}
                    </div>
                  </div>

                  <ul className="space-y-1.5 text-xs">
                    <ChecklistRow
                      label="Question (10–500 chars)"
                      done={sectionQuestionValid}
                    />
                    <ChecklistRow
                      label="Opinion type selected"
                      done={!!watchedType}
                    />
                    <ChecklistRow
                      label={`Valid options (${watchedOptions.length})`}
                      done={sectionOptionsValid}
                    />
                    <ChecklistRow
                      label="Tags ≤ 10"
                      done={sectionTagsValid}
                    />
                    <ChecklistRow
                      label="Media ≤ 10"
                      done={watchedMedia.length <= 10}
                    />
                  </ul>

                  <div className="flex flex-col sm:flex-row xl:flex-col gap-2 pt-2 border-t border-border">
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={saveDraft}
                      disabled={Object.keys(dirtyFields).length === 0}
                      fullWidth
                      leftIcon={
                        draftSavedTs ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )
                      }
                    >
                      {draftSavedTs &&
                      Date.now() - draftSavedTs < 3000
                        ? "Saved!"
                        : "Save draft"}
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="xl"
                      loading={isSubmitting || createPost.isPending}
                      fullWidth
                      leftIcon={<Send className="h-4 w-4" />}
                      disabled={!isValid}
                    >
                      Publish
                    </Button>
                    {(Object.keys(dirtyFields).length > 0 ||
                      watchedQuestion ||
                      watchedMedia.length > 0) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          clearDraft();
                          reset();
                          setTagInput("");
                          setDurationChoice("");
                        }}
                        leftIcon={<Trash2 className="h-4 w-4" />}
                        className="text-muted-foreground hover:text-danger"
                      >
                        Clear form
                      </Button>
                    )}
                  </div>
                </div>
              </Card>

              <div className="hidden xl:block">
                <PostPreview
                  draft={previewDraft}
                  className="xl:max-h-[70vh] overflow-y-auto pr-1"
                />
              </div>
            </div>
          </div>
        </div>
      </form>
    </FormProvider>
  );
};

const ToggleSwitch: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ checked, onChange }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
        checked ? "bg-primary" : "bg-muted"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
};

const ChecklistRow: React.FC<{ label: string; done: boolean }> = ({
  label,
  done,
}) => (
  <li
    className={cn(
      "flex items-center gap-2",
      done ? "text-success" : "text-muted-foreground"
    )}
  >
    {done ? (
      <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
    ) : (
      <span className="h-3.5 w-3.5 rounded-full border-2 border-current opacity-60 flex-shrink-0" />
    )}
    <span className="font-medium">{label}</span>
  </li>
);

const InputImpl: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (
  props
) => (
  <input
    {...props}
    className={cn(
      "flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-slate-400",
      "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "transition-colors duration-200",
      props.className
    )}
  />
);
