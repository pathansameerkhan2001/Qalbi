import type { Metadata } from "next";
import { listEnquiries } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/auth";
import { toggleEnquiryAction } from "@/lib/admin/actions";
import { AdminHeading, Card, dateTime, SetupNotice, StatusBadge } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Enquiries" };

export default async function AdminEnquiriesPage() {
  await requireAdmin();
  let enquiries: Awaited<ReturnType<typeof listEnquiries>>;
  try {
    enquiries = await listEnquiries();
  } catch (error) {
    return (
      <>
        <AdminHeading title="Enquiries" />
        <SetupNotice error={error} migration="store" />
      </>
    );
  }
  return (
    <>
      <AdminHeading title="Enquiries" description="Contact and customised-skincare form submissions (also delivered by email/webhook when configured)." />
      {enquiries.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted">No enquiries yet.</Card>
      ) : (
        <ul className="space-y-3">
          {enquiries.map((e) => (
            <li key={e.id}>
              <Card className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {e.name} <span className="font-normal text-muted">· {e.kind === "custom-skincare" ? "Customised skincare" : "Contact form"}</span>
                    </p>
                    <p className="text-xs text-muted">
                      {dateTime(e.created_at)}
                      {e.email && (
                        <>
                          {" · "}
                          <a href={`mailto:${e.email}`} className="text-forest hover:underline">
                            {e.email}
                          </a>
                        </>
                      )}
                      {e.phone && ` · ${e.phone}`}
                    </p>
                  </div>
                  <form action={toggleEnquiryAction} className="flex items-center gap-3">
                    {!e.handled && <StatusBadge value="pending" />}
                    <input type="hidden" name="id" value={e.id} />
                    <input type="hidden" name="handled" value={e.handled ? "false" : "true"} />
                    <button type="submit" className="btn btn-outline btn-sm">
                      {e.handled ? "Mark as open" : "Mark as handled"}
                    </button>
                  </form>
                </div>
                {e.subject && <p className="mt-3 text-sm font-medium">{e.subject}</p>}
                <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[10rem_1fr]">
                  {Object.entries((e.details ?? {}) as Record<string, string>)
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <div key={k} className="contents">
                        <dt className="text-muted">{k}</dt>
                        <dd className="whitespace-pre-wrap">{String(v)}</dd>
                      </div>
                    ))}
                </dl>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
