import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  and,
  count,
  db,
  eq,
  eventApplicationRequests,
  libraries,
  libraryEventPrograms,
  sql,
  users,
} from '@nearbook/db'
import { EventApplicationAdmissionService, AdmissionResult } from './event-application-admission.service'
import { ListEventProgramsDto } from './dto/list-event-programs.dto'

type ApplicationStatus = 'queued' | 'confirmed' | 'waitlisted' | 'rejected' | 'cancelled'

@Injectable()
export class EventApplicationsService {
  constructor(private readonly admission: EventApplicationAdmissionService) {}

  async listPrograms(query: ListEventProgramsDto) {
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 20
    const offset = (page - 1) * pageSize
    const status = query.status ?? 'published'

    const rows = await db
      .select({
        id: libraryEventPrograms.id,
        title: libraryEventPrograms.title,
        summary: libraryEventPrograms.summary,
        capacity: libraryEventPrograms.capacity,
        confirmedCount: libraryEventPrograms.confirmedCount,
        status: libraryEventPrograms.status,
        startsAt: libraryEventPrograms.startsAt,
        endsAt: libraryEventPrograms.endsAt,
        applicationOpensAt: libraryEventPrograms.applicationOpensAt,
        applicationClosesAt: libraryEventPrograms.applicationClosesAt,
        library: {
          id: libraries.id,
          name: libraries.name,
          region: libraries.region,
          address: libraries.address,
        },
      })
      .from(libraryEventPrograms)
      .innerJoin(libraries, eq(libraryEventPrograms.libraryId, libraries.id))
      .where(eq(libraryEventPrograms.status, status))
      .orderBy(libraryEventPrograms.startsAt)
      .limit(pageSize)
      .offset(offset)

    const [{ total }] = await db
      .select({ total: count() })
      .from(libraryEventPrograms)
      .where(eq(libraryEventPrograms.status, status))

    return { items: rows.map((row) => this.withAvailability(row)), total: Number(total) }
  }

  async getProgram(id: number, supabaseUserId?: string | null) {
    const [program] = await db
      .select({
        id: libraryEventPrograms.id,
        title: libraryEventPrograms.title,
        summary: libraryEventPrograms.summary,
        description: libraryEventPrograms.description,
        capacity: libraryEventPrograms.capacity,
        confirmedCount: libraryEventPrograms.confirmedCount,
        status: libraryEventPrograms.status,
        startsAt: libraryEventPrograms.startsAt,
        endsAt: libraryEventPrograms.endsAt,
        applicationOpensAt: libraryEventPrograms.applicationOpensAt,
        applicationClosesAt: libraryEventPrograms.applicationClosesAt,
        library: {
          id: libraries.id,
          name: libraries.name,
          region: libraries.region,
          address: libraries.address,
          phone: libraries.phone,
          homepage: libraries.homepage,
        },
      })
      .from(libraryEventPrograms)
      .innerJoin(libraries, eq(libraryEventPrograms.libraryId, libraries.id))
      .where(eq(libraryEventPrograms.id, id))
      .limit(1)

    if (!program) throw new NotFoundException('Event program not found')

    const summary = await this.getProgramQueueSummary(id)
    const myApplication = supabaseUserId
      ? await this.findApplicationBySupabaseUserId(id, supabaseUserId)
      : null

    return {
      ...this.withAvailability(program),
      queue: summary,
      myApplication,
    }
  }

  async listMine(supabaseUserId: string) {
    const [user] = await db.select().from(users).where(eq(users.supabaseUserId, supabaseUserId))
    if (!user) return []

    return db
      .select({
        id: eventApplicationRequests.id,
        status: eventApplicationRequests.status,
        queuePosition: eventApplicationRequests.queuePosition,
        processedAt: eventApplicationRequests.processedAt,
        cancelledAt: eventApplicationRequests.cancelledAt,
        createdAt: eventApplicationRequests.createdAt,
        program: {
          id: libraryEventPrograms.id,
          title: libraryEventPrograms.title,
          startsAt: libraryEventPrograms.startsAt,
          applicationClosesAt: libraryEventPrograms.applicationClosesAt,
          libraryName: libraries.name,
        },
      })
      .from(eventApplicationRequests)
      .innerJoin(libraryEventPrograms, eq(eventApplicationRequests.programId, libraryEventPrograms.id))
      .innerJoin(libraries, eq(libraryEventPrograms.libraryId, libraries.id))
      .where(eq(eventApplicationRequests.userId, user.id))
      .orderBy(eventApplicationRequests.createdAt)
  }

  async apply(programId: number, supabaseUserId: string, email?: string, idempotencyKey?: string) {
    const user = await this.getOrCreateUser(supabaseUserId, email)
    const program = await this.getOpenProgram(programId)
    const safeIdempotencyKey = (idempotencyKey?.trim() || `${programId}:${user.id}`).slice(0, 128)

    const existing = await this.findApplication(program.id, user.id)
    if (existing && existing.status !== 'cancelled') {
      return {
        application: await this.applicationResponse(existing.id, existing.status as ApplicationStatus),
        admission: this.skippedAdmission(),
      }
    }

    const admission = await this.admission.waitForTurn(program.id, user.id)
    if (!admission.allowed) {
      throw new HttpException(
        {
          message: 'Too many event applications. Please retry shortly.',
          retryAfterMs: admission.retryAfterMs,
          meta: { admission },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }

    if (existing?.status === 'cancelled') {
      const [requeued] = await db
        .update(eventApplicationRequests)
        .set({
          idempotencyKey: safeIdempotencyKey,
          status: 'queued',
          queuePosition: null,
          retryCount: 0,
          processedAt: null,
          cancelledAt: null,
          lastError: null,
          updatedAt: new Date(),
        })
        .where(eq(eventApplicationRequests.id, existing.id))
        .returning()

      return {
        application: await this.applicationResponse(requeued.id, requeued.status as ApplicationStatus),
        admission,
      }
    }

    const [created] = await db
      .insert(eventApplicationRequests)
      .values({
        programId: program.id,
        userId: user.id,
        idempotencyKey: safeIdempotencyKey,
      })
      .onConflictDoNothing()
      .returning()

    if (created) {
      return {
        application: await this.applicationResponse(created.id, created.status as ApplicationStatus),
        admission,
      }
    }

    const raced = await this.findApplication(program.id, user.id)
    if (!raced) throw new ConflictException('Application conflict could not be resolved')
    return {
      application: await this.applicationResponse(raced.id, raced.status as ApplicationStatus),
      admission,
    }
  }

  async cancel(programId: number, supabaseUserId: string) {
    const [user] = await db.select().from(users).where(eq(users.supabaseUserId, supabaseUserId))
    if (!user) return null

    const result = await db.transaction(async (tx) => {
      const rows = await tx.execute(sql`
        SELECT id, status
        FROM nearbook.event_application_requests
        WHERE program_id = ${programId}
          AND user_id = ${user.id}
          AND status IN ('queued', 'confirmed', 'waitlisted')
        FOR UPDATE
        LIMIT 1
      `)
      const row = rows[0] as { id: number; status: ApplicationStatus } | undefined
      if (!row) return null

      await tx.execute(sql`
        UPDATE nearbook.event_application_requests
        SET status = 'cancelled',
            cancelled_at = now(),
            updated_at = now()
        WHERE id = ${row.id}
      `)

      if (row.status === 'confirmed') {
        await tx.execute(sql`
          UPDATE nearbook.library_event_programs
          SET confirmed_count = GREATEST(confirmed_count - 1, 0),
              updated_at = now()
          WHERE id = ${programId}
        `)
        await tx.execute(sql`
          UPDATE nearbook.event_application_requests
          SET status = 'queued',
              queue_position = NULL,
              processed_at = NULL,
              updated_at = now()
          WHERE id = (
            SELECT id
            FROM nearbook.event_application_requests
            WHERE program_id = ${programId}
              AND status = 'waitlisted'
            ORDER BY created_at ASC, id ASC
            LIMIT 1
          )
        `)
      }

      return { id: row.id, status: 'cancelled' as ApplicationStatus }
    })

    return result
  }

  async processQueuedBatch(limit: number) {
    let processed = 0

    for (let i = 0; i < limit; i += 1) {
      const didProcess = await db.transaction(async (tx) => {
        const requests = await tx.execute(sql`
          SELECT ar.id, ar.program_id
          FROM nearbook.event_application_requests ar
          JOIN nearbook.library_event_programs p ON p.id = ar.program_id
          WHERE ar.status = 'queued'
            AND ar.retry_count < 5
            AND p.status = 'published'
          ORDER BY ar.created_at ASC, ar.id ASC
          FOR UPDATE SKIP LOCKED
          LIMIT 1
        `)
        const request = requests[0] as { id: number; program_id: number } | undefined
        if (!request) return false

        const programs = await tx.execute(sql`
          SELECT id, capacity, confirmed_count
          FROM nearbook.library_event_programs
          WHERE id = ${request.program_id}
          FOR UPDATE
          LIMIT 1
        `)
        const program = programs[0] as { id: number; capacity: number; confirmed_count: number } | undefined
        if (!program) {
          await this.markWorkerFailure(tx, request.id, 'Program not found')
          return true
        }

        if (Number(program.confirmed_count) < Number(program.capacity)) {
          await tx.execute(sql`
            UPDATE nearbook.library_event_programs
            SET confirmed_count = confirmed_count + 1,
                updated_at = now()
            WHERE id = ${program.id}
          `)
          await tx.execute(sql`
            UPDATE nearbook.event_application_requests
            SET status = 'confirmed',
                queue_position = NULL,
                processed_at = now(),
                updated_at = now()
            WHERE id = ${request.id}
          `)
        } else {
          await tx.execute(sql`
            WITH ranked AS (
              SELECT id, row_number() OVER (ORDER BY created_at ASC, id ASC) AS position
              FROM nearbook.event_application_requests
              WHERE program_id = ${program.id}
                AND status IN ('queued', 'waitlisted')
            )
            UPDATE nearbook.event_application_requests ar
            SET status = 'waitlisted',
                queue_position = ranked.position,
                processed_at = now(),
                updated_at = now()
            FROM ranked
            WHERE ar.id = ranked.id
              AND ar.id = ${request.id}
          `)
        }

        return true
      })

      if (!didProcess) break
      processed += 1
    }

    return processed
  }

  private async markWorkerFailure(tx: any, applicationId: number, error: string) {
    await tx.execute(sql`
      UPDATE nearbook.event_application_requests
      SET retry_count = retry_count + 1,
          last_error = ${error},
          status = CASE WHEN retry_count + 1 >= 5 THEN 'rejected' ELSE status END,
          updated_at = now()
      WHERE id = ${applicationId}
    `)
  }

  private skippedAdmission(): AdmissionResult {
    return { allowed: true, mode: 'off', waitedMs: 0, retryAfterMs: 0 }
  }

  private async getOpenProgram(programId: number) {
    const [program] = await db
      .select()
      .from(libraryEventPrograms)
      .where(eq(libraryEventPrograms.id, programId))
      .limit(1)

    if (!program) throw new NotFoundException('Event program not found')
    if (program.status !== 'published') throw new BadRequestException('Event program is not open')

    const now = new Date()
    if (program.applicationOpensAt > now) {
      throw new BadRequestException('Application has not opened yet')
    }
    if (program.applicationClosesAt < now) {
      throw new BadRequestException('Application has closed')
    }

    return program
  }

  private async getOrCreateUser(supabaseUserId: string, email?: string) {
    let user = await db.query.users.findFirst({
      where: eq(users.supabaseUserId, supabaseUserId),
    })

    if (!user) {
      const safeEmail = email?.trim() || `${supabaseUserId}@users.nearbook.local`
      const [created] = await db
        .insert(users)
        .values({
          supabaseUserId,
          email: safeEmail,
          nickname: null,
        })
        .returning()

      user = created
    }

    return user
  }

  private async findApplication(programId: number, userId: number) {
    const [row] = await db
      .select()
      .from(eventApplicationRequests)
      .where(and(eq(eventApplicationRequests.programId, programId), eq(eventApplicationRequests.userId, userId)))
      .limit(1)

    return row ?? null
  }

  private async findApplicationBySupabaseUserId(programId: number, supabaseUserId: string) {
    const [user] = await db.select().from(users).where(eq(users.supabaseUserId, supabaseUserId))
    if (!user) return null

    const app = await this.findApplication(programId, user.id)
    if (!app) return null

    const position = app.status === 'queued' ? await this.getQueuePosition(app.id, programId) : app.queuePosition
    return {
      id: app.id,
      status: app.status,
      queuePosition: position,
      processedAt: app.processedAt,
      cancelledAt: app.cancelledAt,
      createdAt: app.createdAt,
    }
  }

  private async applicationResponse(applicationId: number, status: ApplicationStatus) {
    const [app] = await db
      .select({
        id: eventApplicationRequests.id,
        programId: eventApplicationRequests.programId,
        status: eventApplicationRequests.status,
        queuePosition: eventApplicationRequests.queuePosition,
        processedAt: eventApplicationRequests.processedAt,
        createdAt: eventApplicationRequests.createdAt,
      })
      .from(eventApplicationRequests)
      .where(eq(eventApplicationRequests.id, applicationId))
      .limit(1)

    const position = app.status === 'queued'
      ? await this.getQueuePosition(app.id, app.programId)
      : app.queuePosition

    return {
      applicationId: app.id,
      status,
      position,
      processedAt: app.processedAt,
      createdAt: app.createdAt,
    }
  }

  private async getQueuePosition(applicationId: number, programId: number) {
    const rows = await db.execute(sql`
      SELECT COUNT(*)::int AS position
      FROM nearbook.event_application_requests
      WHERE program_id = ${programId}
        AND status = 'queued'
        AND id <= ${applicationId}
    `)
    const row = rows[0] as { position: number } | undefined
    return Number(row?.position ?? 0)
  }

  private async getProgramQueueSummary(programId: number) {
    const rows = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'queued')::int AS queued,
        COUNT(*) FILTER (WHERE status = 'confirmed')::int AS confirmed,
        COUNT(*) FILTER (WHERE status = 'waitlisted')::int AS waitlisted,
        COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled
      FROM nearbook.event_application_requests
      WHERE program_id = ${programId}
    `)
    const row = rows[0] as any
    return {
      queued: Number(row?.queued ?? 0),
      confirmed: Number(row?.confirmed ?? 0),
      waitlisted: Number(row?.waitlisted ?? 0),
      cancelled: Number(row?.cancelled ?? 0),
    }
  }

  private withAvailability<T extends { applicationOpensAt: Date; applicationClosesAt: Date; status: string }>(row: T) {
    const now = new Date()
    return {
      ...row,
      applicationState:
        row.status !== 'published'
          ? 'closed'
          : row.applicationOpensAt > now
            ? 'scheduled'
            : row.applicationClosesAt < now
              ? 'closed'
              : 'open',
    }
  }
}
