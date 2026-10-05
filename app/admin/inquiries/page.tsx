import { InquiryList } from "@/components/admin/InquiryList";
import { PageHeader, Panel } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/guard";
import { listInquiries } from "@/lib/services/inquiries";

export const metadata = { title: "Inquiries" };
export const dynamic = "force-dynamic";

export default async function AdminInquiriesPage() {
  await requireAdminPage();

  const rows = await listInquiries();
  const waiting = rows.filter((row) => row.status === "NEW").length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Inquiries"
        description="Contact messages, patient refill requests and job applications from the public site."
      />

      <Panel
        title={waiting > 0 ? `${waiting} waiting` : "Nothing waiting"}
        description="Refill requests contain protected health information: the list shows that one arrived, and opening it is recorded."
        bodyClassName="p-0"
      >
        <InquiryList
          rows={rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }))}
        />
      </Panel>
    </div>
  );
}
