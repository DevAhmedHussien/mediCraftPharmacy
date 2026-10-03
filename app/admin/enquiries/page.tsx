import { EnquiryList } from "@/components/admin/EnquiryList";
import { PageHeader, Panel } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/guard";
import { listEnquiries } from "@/lib/services/enquiries";

export const metadata = { title: "Enquiries" };
export const dynamic = "force-dynamic";

export default async function AdminEnquiriesPage() {
  await requireAdminPage();

  const rows = await listEnquiries();
  const waiting = rows.filter((row) => row.status === "NEW").length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Enquiries"
        description="Contact messages, patient refill requests and job applications from the public site."
      />

      <Panel
        title={waiting > 0 ? `${waiting} waiting` : "Nothing waiting"}
        description="Refill requests contain protected health information: the list shows that one arrived, and opening it is recorded."
        bodyClassName="p-0"
      >
        <EnquiryList
          rows={rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }))}
        />
      </Panel>
    </div>
  );
}
