-- SignEasy joins DocuSign behind the same driver interface.
--
-- The 2026 template is already tagged with \c_sig\-style text anchors, which
-- is the convention SignEasy scans a document for — so the file rendered for a
-- partner is the file that goes to it, with no second layout to maintain.
ALTER TYPE "SignatureDriver" ADD VALUE 'SIGNEASY';
