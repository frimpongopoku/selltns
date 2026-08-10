import { Controller, Get, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { HealthService, overallStatus } from './health.service';
import { renderHealthPage } from './health-page';

// Public and unauthenticated by design (a status page needs to be checkable
// without a session), but reveals only pass/fail + short diagnostic text —
// never credentials or full error stack traces. Live-checks third parties
// (R2, Brevo, Vercel) with a 3s timeout each, run in parallel — this is a
// diagnostic page for humans to glance at, not meant to be wired up as a
// tight-loop infra liveness probe (a third party's blip shouldn't be able
// to make Railway think this whole app is down and restart it).
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async getHealth(@Req() req: Request, @Res() res: Response) {
    const start = Date.now();
    const results = await this.healthService.runChecks();
    const status = overallStatus(results);
    const totalMs = Date.now() - start;
    const httpStatus = status === 'error' ? 503 : 200;

    const wantsJson = (req.headers.accept ?? '').includes('application/json');
    if (wantsJson) {
      res.status(httpStatus).json({
        status,
        checkedAt: new Date().toISOString(),
        totalMs,
        checks: results,
      });
      return;
    }

    res
      .status(httpStatus)
      .set('Content-Type', 'text/html; charset=utf-8')
      .send(renderHealthPage({ status, results, totalMs }));
  }
}
