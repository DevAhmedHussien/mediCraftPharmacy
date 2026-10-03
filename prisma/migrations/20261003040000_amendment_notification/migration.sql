-- A change request needs its own notification type.
--
-- Reusing MEETING_REQUESTED would have worked and would have been wrong: the
-- type drives the per-user notification preferences, so an admin who muted
-- meeting requests would silently stop hearing about partners asking to buy
-- more.
ALTER TYPE "NotificationType" ADD VALUE 'AMENDMENT_REQUESTED';
