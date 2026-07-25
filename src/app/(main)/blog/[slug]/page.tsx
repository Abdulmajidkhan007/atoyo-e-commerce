import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPostBySlug } from "@/lib/firebase/admin-content";
import { BlogContent } from "@/components/blog/BlogContent";

export const dynamic = "force-dynamic";

interface BlogPostPageParams {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: BlogPostPageParams): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  return { title: post ? `${post.title} | Atoyo Blog` : "Maqola topilmadi" };
}

export default async function BlogPostPage({ params }: BlogPostPageParams) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post || !post.isPublished) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/blog" className="text-sm text-aqua-600 hover:underline dark:text-aqua-300">← Blogga qaytish</Link>
      <h1 className="mt-4 text-3xl font-bold text-navy-900 dark:text-white">{post.title}</h1>
      <p className="mt-2 text-sm text-navy-300">{new Date(post.createdAt).toLocaleDateString("uz-UZ")}</p>

      {post.coverImageUrl && (
        <div className="relative mt-6 aspect-video overflow-hidden rounded-xl2 bg-navy-50 dark:bg-navy-900">
          <Image src={post.coverImageUrl} alt={post.title} fill sizes="(max-width:768px) 100vw, 768px" className="object-cover" priority />
        </div>
      )}

      <div className="mt-6">
        <BlogContent content={post.content} />
      </div>
    </article>
  );
}
