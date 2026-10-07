import "server-only";

/**
 * Drain both outboxes now, rather than on the five-minute cron.
 *
 * WHY THIS IS ONE FUNCTION AND NOT TWO CALLS AT EACH SITE. The email kick
 * shipped first and drained only `processOutbox`, leaving the CRM rows that
 * the SAME transaction had written to wait for the cron — so a partner got
 * their confirmation in seconds while GoHighLevel learned about the move up
 * to five minutes later. The two queues are written together and they should
 * drain together; a single entry point is what stops them diverging again.
 *
 * NOT AWAITED BY CALLERS. Every caller is a server action returning to
 * somebody who just pressed a button. Putting an SMTP round trip and a
 * GoHighLevel round trip on that path is the problem the outboxes exist to
 * avoid; this only moves the common case from minutes to seconds.
 *
 * NOTHING MAY DEPEND ON IT SUCCEEDING. Both processors claim each row before
 * their network call, so this is safe beside the cron and beside another
 * request. If the process dies, the send fails, or a third party is down,
 * the row keeps its backoff and the cron retries it. The cron remains the
 * delivery guarantee.
 */
export function kickOutboxes(): void {
  void (async () => {
    const [{ processOutbox }, { processCrmOutbox }] = await Promise.all([
      import("@/lib/services/email"),
      import("@/lib/services/partner-crm"),
    ]);

    /* `allSettled`, not `all`: a GoHighLevel outage must not stop the
       confirmation email, and vice versa. They are independent deliveries
       that happen to be triggered together. */
    await Promise.allSettled([processOutbox(), processCrmOutbox()]);
  })().catch(() => {
    /* Swallowed deliberately. The work that mattered has already committed
       and the response is already on its way; throwing here would turn a
       delivered status change into a 500 over a retry the cron will make
       anyway. */
  });
}
