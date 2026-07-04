import { getAllPosts } from "@/lib/firebase/admin-content";
import { BlogManager } from "@/components/admin/BlogManager";

export const dynamic = "force-dynamic";

export default async function AdminBlogPage() {
  const posts = await getAllPosts();
  return <BlogManager initialPosts={posts} />;
}
