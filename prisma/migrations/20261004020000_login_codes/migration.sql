-- Sign in with a code emailed to you, as an alternative to a password.
--
-- The code itself is never stored. `codeHash` is a bcrypt of the six digits,
-- for the same reason PasswordResetToken stores a SHA-256 of its token: six
-- digits is a small enough space that a leaked table of plaintext codes would
-- be a leaked table of live sessions.
--
-- `email` rather than `userId`, because a request must look identical whether
-- or not the address has an account — a login form that behaves differently
-- for a known address is an account-enumeration oracle. Rows are written only
-- for real, active users; the column shape is what keeps the two paths the
-- same.

CREATE TABLE "LoginCode" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginCode_pkey" PRIMARY KEY ("id")
);

-- The verify path reads the newest unconsumed code for an address.
CREATE INDEX "LoginCode_email_createdAt_idx" ON "LoginCode"("email", "createdAt");
-- Lets expired rows be swept without a sequential scan.
CREATE INDEX "LoginCode_expiresAt_idx" ON "LoginCode"("expiresAt");
