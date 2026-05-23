import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    draft: z.boolean().default(false),
    ogImage: z.string().optional(),
    author: z.string().optional(),
    canonicalUrl: z.string().optional(),
    readingTime: z.number().optional(),
  }),
});

const works = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/works" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    status: z.enum(["active", "archived", "wip"]),
    heroImage: z.string().optional(),
    repoUrl: z.string().url().optional(),
    lpUrl: z.string().url(),
    demoUrl: z.string().url().optional(),
    tags: z.array(z.string()),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    featured: z.boolean().default(false),
  }),
});

export const collections = { blog, works };
