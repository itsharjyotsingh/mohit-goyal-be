import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

export let errorRate = new Rate('errors');

export let options = {
    stages: [
        { duration: '1m', target: 5 },   // Start with fewer users
        { duration: '2m', target: 10 },  // Gradually increase
        { duration: '1m', target: 0 },   // Ramp down
    ],
    thresholds: {
        http_req_duration: ['p(95)<2000'], // 2 seconds instead of 500ms for API calls
        http_req_failed: ['rate<0.05'],
        errors: ['rate<0.1'],
    },
};

// Use the actual API URL from your frontend
const BASE_URL = 'https://api.themohitgoyal.com';

export function setup() {
    // Test if server is reachable
    console.log(`Testing connection to ${BASE_URL}...`);

    const healthCheck = http.get(`${BASE_URL}/health`, {
        timeout: '10s',
    });

    console.log(`Health check status: ${healthCheck.status}`);
    if (healthCheck.status === 0) {
        console.warn('Health endpoint not responding, but continuing with payment test...');
    }

    return { baseUrl: BASE_URL };
}

export default function (data) {
    // You'll need to get a real event_id from your events endpoint
    // or use the one from your frontend
    const testData = {
        customer_name: `Load Test User ${Math.random().toString(36).substring(7)}`,
        mobile: `9${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}`,
        email: `loadtest${Math.random().toString(36).substring(7)}@example.com`,
        description: 'Workshop tickets',
        event_id: '2bbb1bf5-29a5-4d86-8916-a96e1d472cb4' // Use actual event ID
    };

    const response = http.post(
        `${BASE_URL}/api/v1/payment/createOrder`,
        JSON.stringify(testData),
        {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'k6-load-test/1.0',
            },
            timeout: '30s',
        }
    );

    // Debug logging for failures
    if (response.status === 0) {
        console.error('Connection failed to API server');
    } else if (response.status >= 400) {
        console.error(`HTTP ${response.status}: ${response.body}`);
        console.error('Request body was:', JSON.stringify(testData));
    }

    const success = check(response, {
        'server is reachable': (r) => r.status !== 0,
        'create order status is 200': (r) => r.status === 200,
        'create order response has success': (r) => {
            if (r.status === 0) return false;
            try {
                const body = JSON.parse(r.body);
                return body.success === true;
            } catch (e) {
                console.error('JSON parse error:', e, 'Body:', r.body);
                return false;
            }
        },
        'create order has orderId': (r) => {
            if (r.status === 0) return false;
            try {
                const body = JSON.parse(r.body);
                return body.data && body.data.orderId;
            } catch (e) {
                return false;
            }
        },
        'response time < 2s': (r) => r.timings.duration < 2000,
    });

    errorRate.add(!success);
    sleep(1);
}
