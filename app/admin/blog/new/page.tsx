
import { PageHeader } from "@/components/admin/ui";
import { PostForm } from "@/components/admin/PostForm";
import { requireAdminPage } from "@/lib/guard";
import { listAllCategories } from "@/lib/services/posts";

export const metadata = { title: "New article" };

export default async function NewPostPage() {
  await requireAdminPage();
  const categories = await listAllCategories();

  return (
    <div>
      <PageHeader back={{ href: "/admin/blog", label: "Articles" }} title="New article" />
      <PostForm categories={categories} />
    </div>
  );
}
