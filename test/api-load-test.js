import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
export let errorRate = new Rate('errors');
export let responseTime = new Trend('response_time');
export let requestCount = new Counter('requests');

export let options = {
    scenarios: {
        // Light load test
        light_load: {
            executor: 'constant-vus',
            vus: 5,
            duration: '2m',
        },
        // Stress test
        stress_test: {
            executor: 'ramping-vus',
            startTime: '2m',
            stages: [
                { duration: '1m', target: 20 },
                { duration: '2m', target: 50 },
                { duration: '1m', target: 100 },
                { duration: '2m', target: 100 },
                { duration: '1m', target: 0 },
            ],
        },
        // Spike test
        spike_test: {
            executor: 'ramping-vus',
            startTime: '9m',
            stages: [
                { duration: '10s', target: 200 },
                { duration: '1m', target: 200 },
                { duration: '10s', target: 0 },
            ],
        },
    },
    thresholds: {
        http_req_duration: ['p(95)<1000', 'p(99)<2000'],
        http_req_failed: ['rate<0.1'],
        errors: ['rate<0.1'],
        checks: ['rate>0.9'],
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || '';

export default function () {
    group('Payment API Tests', () => {
        testHealthCheck();
        testCreatePaymentOrder();
        testGetEvents();
    });

    sleep(Math.random() * 2 + 1); // Random sleep between 1-3 seconds
}

function testHealthCheck() {
    group('Health Check', () => {
        const response = http.get(`${BASE_URL}/health`);

        check(response, {
            'health check status is 200': (r) => r.status === 200,
            'health check response time < 100ms': (r) => r.timings.duration < 100,
        });

        requestCount.add(1);
        responseTime.add(response.timings.duration);
    });
}

function testCreatePaymentOrder() {
    group('Create Payment Order', () => {
        const payload = {
            customer_name: generateRandomName(),
            mobile: generateRandomMobile(),
            email: generateRandomEmail(),
            description: 'Load test workshop registration',
            event_id: '7215e959-4a7f-4134-a5cf-5b6489df94b5'
        };

        const response = http.post(
            `${BASE_URL}/api/v1/payment/createOrder`,
            JSON.stringify(payload),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`,
                },
                timeout: '30s',
            }
        );

        const success = check(response, {
            'create order status is 200': (r) => r.status === 200,
            'create order has success field': (r) => {
                try {
                    const body = JSON.parse(r.body);
                    return body.hasOwnProperty('success');
                } catch (e) {
                    console.log('Parse error:', e);
                    return false;
                }
            },
            'create order response time < 2s': (r) => r.timings.duration < 2000,
        });

        if (!success) {
            console.log('Failed response:', response.body);
        }

        errorRate.add(!success);
        requestCount.add(1);
        responseTime.add(response.timings.duration);
    });
}

function testGetEvents() {
    group('Get Events', () => {
        const response = http.get(`${BASE_URL}/api/v1/events`, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
            },
        });

        check(response, {
            'get events status is 200': (r) => r.status === 200,
            'get events response time < 500ms': (r) => r.timings.duration < 500,
        });

        requestCount.add(1);
        responseTime.add(response.timings.duration);
    });
}

// Helper functions
function generateRandomName() {
    const names = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Lisa'];
    const surnames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones'];
    return `${names[Math.floor(Math.random() * names.length)]} ${surnames[Math.floor(Math.random() * surnames.length)]}`;
}

function generateRandomMobile() {
    return `9${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}`;
}

function generateRandomEmail() {
    return `loadtest${Math.random().toString(36).substring(7)}@example.com`;
}
