import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { SessionAuthGuard } from "../auth/guards/session-auth.guard";
import { NotificationsService } from "./notifications.service";

/**
 * A user's own transaction notifications.
 *
 * Deliberately *not* behind the administrator gate the audit controller uses.
 * That gate is there because `/audit` serves the whole trail — every user's
 * changes, before and after values included. This surface serves one user their
 * own rows and nobody else's, and the scoping is not a filter the caller passes
 * but the session: there is no parameter here that names a user, so there is
 * nothing to tamper with.
 */
@ApiTags("notifications")
@ApiBearerAuth()
@UseGuards(SessionAuthGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  /** The id the audit trail records — see AuditInterceptor, which writes the same one. */
  private userId(req: any): string {
    const id = req?.user?.id;
    if (!id) throw new UnauthorizedException("No signed-in user");
    return String(id);
  }

  @Get()
  @ApiOperation({ summary: "This user's record transactions, newest first" })
  async list(
    @Req() req: any,
    @Query("limit") limit?: string,
    @Query("before") before?: string
  ) {
    return this.notifications.list(
      this.userId(req),
      limit ? Number.parseInt(limit, 10) : 30,
      before || undefined
    );
  }

  @Get("unread-count")
  @ApiOperation({ summary: "How many transactions this user has not read" })
  async unreadCount(@Req() req: any) {
    return { unread: await this.notifications.unreadCount(this.userId(req)) };
  }

  @Post("read")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Mark specific notifications read" })
  async markRead(@Req() req: any, @Body() body: { ids?: string[] }) {
    const ids = Array.isArray(body?.ids) ? body.ids.filter((id) => typeof id === "string") : [];
    return this.notifications.markRead(this.userId(req), ids);
  }

  @Post("read-all")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Mark every one of this user's notifications read" })
  async markAllRead(@Req() req: any) {
    return this.notifications.markAllRead(this.userId(req));
  }
}
