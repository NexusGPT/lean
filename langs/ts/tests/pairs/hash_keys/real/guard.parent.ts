import { createHash, timingSafeEqual } from "node:crypto";

import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException
} from "@nestjs/common";
import type { Request } from "express";
import { EnvService } from "src/config/env.service";

const BEARER_PREFIX = "Bearer ";

function sha256(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

/**
 * Admits the custom-domain edge to its route snapshot by a platform bearer token
 * (`VIBE_CUSTOM_DOMAIN_ROUTES_TOKEN`).
 *
 * Fails closed: an unset token refuses every caller, and the cause is logged,
 * never returned — a caller without the credential learns nothing about why.
 *
 * The comparison is over SHA-256 digests with `timingSafeEqual`: both sides are
 * 32 bytes whatever was presented, so neither the length nor any prefix of the
 * token can be recovered from response timing.
 */
@Injectable()
export class VibeCustomDomainRoutesTokenGuard implements CanActivate {
  private readonly logger = new Logger(VibeCustomDomainRoutesTokenGuard.name);

  constructor(private readonly env: EnvService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.env.vibeCustomDomainRoutesToken;
    if (expected === undefined) {
      this.logger.error(
        "Custom-domain routes requested but VIBE_CUSTOM_DOMAIN_ROUTES_TOKEN is not configured; refusing."
      );
      throw new UnauthorizedException();
    }

    const header = context.switchToHttp().getRequest<Request>().headers.authorization;
    const presented =
      typeof header === "string" && header.startsWith(BEARER_PREFIX)
        ? header.slice(BEARER_PREFIX.length)
        : "";
    if (presented.length === 0 || !timingSafeEqual(sha256(presented), sha256(expected))) {
      throw new UnauthorizedException();
    }
    return true;
  }
}
