import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { API_V1_PREFIX } from '../src/config/api-version';

describe('App Audit API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    process.env.JWT_SECRET =
      process.env.JWT_SECRET ??
      'e2e-test-secret-with-at-least-32-characters-long';
    process.env.NODE_ENV = 'test';
    process.env.THREAT_INTEL_SYNC_ON_STARTUP = 'false';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.setGlobalPrefix(API_V1_PREFIX, {
      exclude: [
        { path: 'health', method: RequestMethod.GET },
        { path: 'health/ready', method: RequestMethod.GET },
      ],
    });
    await app.init();
  }, 60_000);

  afterAll(async () => {
    await app.close();
  });

  it('GET /health — liveness', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        const body = res.body as { status: string };
        expect(body.status).toBe('ok');
      });
  });

  it('GET /health/ready — readiness', () => {
    return request(app.getHttpServer())
      .get('/health/ready')
      .expect(200)
      .expect((res) => {
        const body = res.body as { checks: unknown; version: unknown };
        expect(body.checks).toBeDefined();
        expect(body.version).toBeDefined();
      });
  });

  it('GET /v1/auth/legal/info — informações legais', () => {
    return request(app.getHttpServer())
      .get(`/${API_V1_PREFIX}/auth/legal/info`)
      .expect(200)
      .expect((res) => {
        const body = res.body as {
          policyVersion: unknown;
          contactEmail: unknown;
        };
        expect(body.policyVersion).toBeDefined();
        expect(body.contactEmail).toBeDefined();
      });
  });

  it('GET /v1/auth/login/consent', () => {
    return request(app.getHttpServer())
      .get(`/${API_V1_PREFIX}/auth/login/consent`)
      .expect(200);
  });

  it('POST /v1/auth/login — rejeita sem consentimento', () => {
    return request(app.getHttpServer())
      .post(`/${API_V1_PREFIX}/auth/login`)
      .send({ email: 'nope@test.com', password: 'short' })
      .expect(400);
  });
});
