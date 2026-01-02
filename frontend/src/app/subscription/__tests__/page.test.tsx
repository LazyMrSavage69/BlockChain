import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Subscription from '../page';

// Mock fetch
global.fetch = jest.fn();

describe('Subscription Page', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Mock user API
        (global.fetch as jest.Mock).mockImplementation((url: string) => {
            if (url === '/api/me') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ id: 1, email: 'test@example.com', name: 'Test User' }),
                });
            }

            // Mock subscription endpoint
            if (url.includes('/api/subscriptions/user/')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        success: true,
                        data: {
                            id: '123',
                            user_email: 'test@example.com',
                            plan_id: 'free',
                            status: 'active',
                            current_period_start: new Date().toISOString(),
                            current_period_end: new Date().toISOString(),
                        },
                    }),
                });
            }

            // Mock usage check endpoint
            if (url.includes('/api/subscriptions/usage/check')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        success: true,
                        data: {
                            canCreate: true,
                            used: 0,
                            limit: 1,
                            planId: 'free',
                        },
                    }),
                });
            }

            // Mock usage history endpoint
            if (url.includes('/api/subscriptions/usage/history')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        success: true,
                        data: [],
                    }),
                });
            }

            return Promise.reject(new Error('Unknown endpoint'));
        });
    });

    it('renders subscription page title', async () => {
        render(<Subscription />);

        await waitFor(() => {
            expect(screen.getByText(/Choose your plan/i)).toBeInTheDocument();
        });
    });

    it('displays three plan options', async () => {
        render(<Subscription />);

        await waitFor(() => {
            expect(screen.getByText('Free')).toBeInTheDocument();
            expect(screen.getByText('Standard')).toBeInTheDocument();
            expect(screen.getByText('Creator')).toBeInTheDocument();
        });
    });

    it('shows subscription summary when user is logged in', async () => {
        render(<Subscription />);

        await waitFor(() => {
            expect(screen.getByText(/Your Subscription/i)).toBeInTheDocument();
        });
    });

    it('displays correct pricing information', async () => {
        render(<Subscription />);

        await waitFor(() => {
            expect(screen.getByText('$0')).toBeInTheDocument();
            expect(screen.getByText('$29')).toBeInTheDocument();
            expect(screen.getByText('$99')).toBeInTheDocument();
        });
    });

    it('displays plan features', async () => {
        render(<Subscription />);

        await waitFor(() => {
            expect(screen.getByText(/Access to 1 free contract template/i)).toBeInTheDocument();
            expect(screen.getByText(/Up to 10 contracts per day/i)).toBeInTheDocument();
            expect(screen.getByText(/Unlimited contract usage/i)).toBeInTheDocument();
        });
    });

    it('shows loading state initially', () => {
        render(<Subscription />);

        const spinners = document.querySelectorAll('.animate-spin');
        expect(spinners.length).toBeGreaterThan(0);
    });
});
