import { z } from "zod";

/** Regex that validates http(s) URLs; rejects bare strings, data:, javascript:, etc. */
const HTTP_URL_RE = /^https?:\/\/[\w-]+(\.[\w-]+)+([\/?#]\S*)?$/i;

export const claimFormSchema = z.object({
  claimText: z
    .string()
    .trim()
    .min(10, "Claim text must be at least 10 characters.")
    .max(5000, "Claim text must be 5 000 characters or fewer."),

  // Keep this as a plain string so RHF and the schema agree on the empty default.
  platform: z
    .string()
    .min(1, "Platform is required — choose where you saw this claim."),

  category: z
    .string()
    .min(1, "Category is required — choose one of the four options."),

  sourceUrl: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || HTTP_URL_RE.test(value),
      "Source URL must start with http:// or https:// (leave blank if you have no link)."
    )
    ,
});

export type ClaimFormValues = z.infer<typeof claimFormSchema>;
