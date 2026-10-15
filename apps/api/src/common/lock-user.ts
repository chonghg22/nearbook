import { db, users, eq } from '@nearbook/db'

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

/** Serialize personal mutations on the user row; no schema or account-policy change. */
export async function lockUser(
  tx: Transaction,
  supabaseUserId: string,
  create = false,
  email?: string
) {
  if (create) {
    await tx
      .insert(users)
      .values({ supabaseUserId, email: email?.trim() || null, nickname: null })
      .onConflictDoNothing({ target: users.supabaseUserId })
  }
  const [user] = await tx
    .select()
    .from(users)
    .where(eq(users.supabaseUserId, supabaseUserId))
    .for('update')
  return user
}
