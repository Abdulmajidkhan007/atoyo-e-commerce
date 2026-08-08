import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getPublishedPosts } from "@/lib/firebase/admin-content";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog | Atoyo Santexnika",
  alternates: { canonical: "/blog" },
};

export default async function BlogPage() {
  const posts = await getPublishedPosts();

  return (
    <section className="mx-auto max-w-5xl px-4 py-10">
      <Breadcrumbs items={[{ name: "Blog" }]} />
      <h1 className="mb-6 text-3xl font-bold text-navy-900 dark:text-white">Blog va yangiliklar</h1>

      {posts.length === 0 ? (
        <p className="text-navy-300">Hozircha maqolalar yo&apos;q.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="flex flex-col overflow-hidden rounded-xl2 border border-navy-100 bg-white transition hover:shadow-lg dark:border-navy-500 dark:bg-navy-700"
            >
              <div className="relative aspect-video bg-navy-50 dark:bg-navy-900">
                {post.coverImageUrl ? (
                  <Image src={post.coverImageUrl} alt={post.title} fill sizes="(max-width:768px) 100vw, 33vw" className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-navy-300">📰</div>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <p className="text-xs text-navy-300">{new Date(post.createdAt).toLocaleDateString("uz-UZ")}</p>
                <h2 className="line-clamp-2 font-semibold text-navy-900 dark:text-white">{post.title}</h2>
                <p className="line-clamp-3 text-sm text-navy-500 dark:text-navy-100">{post.excerpt}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
