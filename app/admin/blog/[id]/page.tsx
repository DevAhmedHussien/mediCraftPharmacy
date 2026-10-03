import { notFound } from "next/navigation";

import { PageHeader } from "@/components/admin/ui";
import { PostForm } from "@/components/admin/PostForm";
import { requireAdminPage } from "@/lib/guard";
import { getPost, listAllCategories } from "@/lib/services/posts";

export const metadata = { title: "Edit article" };

export default async function EditPostPage({ params }: { params: { id: string } }) {
  await requireAdminPage();

  const [post, categories] = await Promise.all([getPost(params.id), listAllCategories()]);
  if (!post) notFound();

  return (
    <div>
      <PageHeader back={{ href: "/admin/blog", label: "Articles" }} title={post.title} />
      <PostForm post={post} categories={categories} />
    </div>
  );
}
