-- SignEasy deliveries need somewhere to land.
--
-- The WebhookEvent table is keyed on (provider, externalId) so a redelivery
-- is an insert conflict rather than a second MSA_SIGNED transition. That only
-- works if SignEasy is a provider the enum admits.
ALTER TYPE "WebhookProvider" ADD VALUE 'SIGNEASY';
