import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { BLOG_CATEGORIES, WORKS_STATUSES } from "./lib/content-schema";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdoc}", base: "./src/content/blog" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      heroImage: image().optional(),
      category: z.enum(BLOG_CATEGORIES).optional(),
      tags: z.array(z.string()).optional(),
      draft: z.boolean().default(false),
      ogImage: z.string().optional(),
      author: z.string().optional(),
      canonicalUrl: z.url().optional(),
    }),
});

const works = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdoc}", base: "./src/content/works" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      status: z.enum(WORKS_STATUSES),
      heroImage: image().optional(),
      repoUrl: z.url().optional(),
      lpUrl: z.url(),
      demoUrl: z.url().optional(),
      tags: z.array(z.string()),
      createdAt: z.coerce.date(),
      updatedAt: z.coerce.date().optional(),
      featured: z.boolean().default(false),
    }),
});

export const collections = { blog, works };
