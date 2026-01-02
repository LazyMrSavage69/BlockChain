import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Subscription API (e2e)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe());
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('/api/subscriptions/health (GET)', () => {
        it('should return health status', () => {
            return request(app.getHttpServer())
                .get('/api/subscriptions/health')
                .expect(200)
                .expect((res) => {
                    expect(res.body.status).toBe('ok');
                    expect(res.body.service).toBe('subscription-service');
                });
        });
    });

    describe('/api/subscriptions/usage/check (POST)', () => {
        it('should check usage for a user', () => {
            return request(app.getHttpServer())
                .post('/api/subscriptions/usage/check')
                .send({ userEmail: 'test@example.com' })
                .expect(200)
                .expect((res) => {
                    expect(res.body.success).toBe(true);
                    expect(res.body.data).toHaveProperty('canCreate');
                    expect(res.body.data).toHaveProperty('used');
                    expect(res.body.data).toHaveProperty('limit');
                    expect(res.body.data).toHaveProperty('planId');
                });
        });

        it('should return 400 for invalid email', () => {
            return request(app.getHttpServer())
                .post('/api/subscriptions/usage/check')
                .send({ userEmail: 'invalid-email' })
                .expect(400);
        });

        it('should return 400 for missing userEmail', () => {
            return request(app.getHttpServer())
                .post('/api/subscriptions/usage/check')
                .send({})
                .expect(400);
        });
    });

    describe('/api/subscriptions/user/:email (GET)', () => {
        it('should get or create subscription for user', () => {
            return request(app.getHttpServer())
                .get('/api/subscriptions/user/test@example.com')
                .expect(200)
                .expect((res) => {
                    expect(res.body.success).toBe(true);
                    expect(res.body.data).toHaveProperty('plan_id');
                    expect(res.body.data).toHaveProperty('status');
                });
        });
    });

    describe('/api/subscriptions/plans/:planId (GET)', () => {
        it('should return plan limits for free plan', () => {
            return request(app.getHttpServer())
                .get('/api/subscriptions/plans/free')
                .expect(200)
                .expect((res) => {
                    expect(res.body.success).toBe(true);
                    expect(res.body.data.contractsPerDay).toBe(1);
                });
        });

        it('should return unlimited for creator plan', () => {
            return request(app.getHttpServer())
                .get('/api/subscriptions/plans/creator')
                .expect(200)
                .expect((res) => {
                    expect(res.body.success).toBe(true);
                    expect(res.body.data.contractsPerDay).toBe('unlimited');
                });
        });
    });
});
