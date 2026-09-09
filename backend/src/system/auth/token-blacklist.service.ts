import { Injectable } from '@nestjs/common';

@Injectable()
export class TokenBlacklistService {
  // En producción real esto suele guardarse en Redis. Para el MVP, memoria RAM es perfecta.
  private blacklist: Set<string> = new Set();

  add(token: string) {
    this.blacklist.add(token);
  }

  isRevoked(token: string): boolean {
    return this.blacklist.has(token);
  }
}
