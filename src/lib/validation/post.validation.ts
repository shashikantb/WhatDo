import { z } from "zod";

export const PostTypeEnum = z.enum([
  "YES_NO",
  "MULTIPLE_CHOICE",
  "A_VS_B",
  "RATING",
  "EMOJI",
  "POLL",
  "PRICE",
  "DECISION",
  "PREDICTION",
]);

export const PostMediaTypeEnum = z.enum(["IMAGE", "VIDEO", "GIF", "LINK"]);

export const PostOptionSchema = z.object({
  label: z.string().max(60, "Option label must be 60 characters or less"),
  value: z.string().max(60, "Option value must be 60 characters or less"),
  imageUrl: z.string().url("Invalid image URL").optional().or(z.literal("")),
  sortOrder: z.number().int(),
});

export const PostMediaSchema = z.object({
  type: PostMediaTypeEnum,
  url: z.string().refine((v) => {
    if (!v) return false;
    if (v.startsWith("blob:")) return true;
    try {
      new URL(v);
      return true;
    } catch {
      return false;
    }
  }, "Media URL must be a valid URL or local preview URL"),
  thumbnailUrl: z
    .string()
    .optional()
    .refine(
      (v) =>
        v === undefined ||
        v === "" ||
        v.startsWith("blob:") ||
        (() => {
          try {
            new URL(v);
            return true;
          } catch {
            return false;
          }
        })(),
      "Thumbnail URL must be a valid URL or local preview URL",
    ),
  posterUrl: z
    .string()
    .optional()
    .refine(
      (v) =>
        v === undefined ||
        v === "" ||
        v.startsWith("blob:") ||
        (() => {
          try {
            new URL(v);
            return true;
          } catch {
            return false;
          }
        })(),
      "Poster URL must be a valid URL or local preview URL",
    ),
  mimeType: z.string().optional(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  duration: z
    .union([z.number().finite(), z.number().int()])
    .optional()
    .transform((v) => (v === undefined ? v : Math.round(v))),
  fileSize: z.number().int().optional(),
  sortOrder: z.number().int().default(0),
});

export const createPostSchema = z.object({
  question: z
    .string()
    .min(10, "Question must be at least 10 characters")
    .max(500, "Question must be 500 characters or less"),
  type: PostTypeEnum,
  categoryId: z.string().optional(),
  isAnonymous: z.boolean().default(false),
  allowComments: z.boolean().default(true),
  tags: z
    .array(z.string().max(30, "Tag must be 30 characters or less"))
    .max(10, "Maximum 10 tags allowed")
    .default([]),
  options: z
    .array(PostOptionSchema)
    .min(2, "At least 2 options are required")
    .max(10, "Maximum 10 options allowed"),
  media: z.array(PostMediaSchema).max(10, "Maximum 10 media files allowed").default([]),
  expiresAt: z
    .union([z.coerce.date(), z.string().length(0), z.null()])
    .optional()
    .transform((v) => (v === null || v === "" ? undefined : (v as Date | undefined))),
  anonymous: z.boolean().default(false),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;

export function getDefaultOptionsForType(type: z.infer<typeof PostTypeEnum>) {
  switch (type) {
    case "YES_NO":
      return [
        { label: "Yes", value: "yes", sortOrder: 0 },
        { label: "No", value: "no", sortOrder: 1 },
      ];
    case "MULTIPLE_CHOICE":
      return [
        { label: "Option A", value: "a", sortOrder: 0 },
        { label: "Option B", value: "b", sortOrder: 1 },
        { label: "Option C", value: "c", sortOrder: 2 },
      ];
    case "A_VS_B":
      return [
        { label: "Option A", value: "a", imageUrl: "", sortOrder: 0 },
        { label: "Option B", value: "b", imageUrl: "", sortOrder: 1 },
      ];
    case "RATING":
      return [
        { label: "1", value: "1", sortOrder: 0 },
        { label: "2", value: "2", sortOrder: 1 },
        { label: "3", value: "3", sortOrder: 2 },
        { label: "4", value: "4", sortOrder: 3 },
        { label: "5", value: "5", sortOrder: 4 },
      ];
    case "EMOJI":
      return [
        { label: "👍", value: "👍", sortOrder: 0 },
        { label: "❤️", value: "❤️", sortOrder: 1 },
        { label: "😂", value: "😂", sortOrder: 2 },
        { label: "😮", value: "😮", sortOrder: 3 },
      ];
    case "POLL":
      return [
        { label: "Option 1", value: "1", sortOrder: 0 },
        { label: "Option 2", value: "2", sortOrder: 1 },
      ];
    case "PRICE":
      return [
        { label: "₹0 - ₹500", value: "0-500", sortOrder: 0 },
        { label: "₹500 - ₹2,000", value: "500-2000", sortOrder: 1 },
        { label: "₹2,000 - ₹10,000", value: "2000-10000", sortOrder: 2 },
        { label: "₹10,000+", value: "10000+", sortOrder: 3 },
      ];
    case "DECISION":
      return [
        { label: "DO IT", value: "do_it", sortOrder: 0 },
        { label: "DON'T DO IT", value: "dont_do_it", sortOrder: 1 },
        { label: "NOT SURE", value: "not_sure", sortOrder: 2 },
      ];
    case "PREDICTION":
      return [
        { label: "Yes", value: "yes", sortOrder: 0 },
        { label: "No", value: "no", sortOrder: 1 },
      ];
    default:
      return [
        { label: "Option 1", value: "1", sortOrder: 0 },
        { label: "Option 2", value: "2", sortOrder: 1 },
      ];
  }
}
