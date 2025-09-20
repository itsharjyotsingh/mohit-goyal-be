import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
export let errorRate = new Rate('errors');
export let responseTime = new Trend('response_time');
export let requestCount = new Counter('total_requests');

export let options = {
    scenarios: {
        // Instant spike - all 50 users hit at the same time
        instant_spike: {
            executor: 'constant-vus',
            vus: 50,
            duration: '1m', // Keep load for 1 minute
            gracefulStop: '10s',
        },
    },
    thresholds: {
        http_req_duration: [
            'p(50)<500',   // 50% under 500ms
            'p(95)<2000',  // 95% under 2s (same as your working test)
            'p(99)<5000',  // 99% under 5s
        ],
        http_req_failed: ['rate<0.05'], // Same as your working test
        errors: ['rate<0.1'], // Same as your working test
    },
};

// Use the same API URL that works
const BASE_URL = 'https://api.themohitgoyal.com';

export function setup() {
    console.log('🔥 SPIKE TEST: 50 concurrent users hitting API simultaneously!');
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
    const startTime = Date.now();

    // Use the same test data structure that works
    const testData = {
        customer_name: `Spike Test User ${Math.random().toString(36).substring(7)}`,
        mobile: `9${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}`,
        email: `spiketest${Math.random().toString(36).substring(7)}@example.com`,
        description: 'Workshop tickets - Spike Test',
        event_id: '2bbb1bf5-29a5-4d86-8916-a96e1d472cb4' // Same event ID that works
    };

    const response = http.post(
        `${BASE_URL}/api/v1/payment/createOrder`,
        JSON.stringify(testData),
        {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': `k6-spike-test-vu-${__VU}`,
            },
            timeout: '30s', // Same timeout as working test
        }
    );

    const duration = Date.now() - startTime;
    responseTime.add(duration);
    requestCount.add(1);

    // Debug logging for failures (same as working test)
    if (response.status === 0) {
        console.error(`VU ${__VU}: Connection failed to API server`);
    } else if (response.status >= 400) {
        console.error(`VU ${__VU}: HTTP ${response.status}: ${response.body}`);
        console.error(`VU ${__VU}: Request body was:`, JSON.stringify(testData));
    }

    // Same checks as your working test + additional spike-specific checks
    const success = check(response, {
        'server is reachable': (r) => r.status !== 0,
        'create order status is 200': (r) => r.status === 200,
        'create order response has success': (r) => {
            if (r.status === 0) return false;
            try {
                const body = JSON.parse(r.body);
                return body.success === true;
            } catch (e) {
                console.error(`VU ${__VU}: JSON parse error:`, e, 'Body:', r.body);
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
        'response time < 5s': (r) => r.timings.duration < 5000, // Additional check for spike
    });

    // Log slow responses during spike
    if (response.timings.duration > 1000) {
        console.warn(`🐌 VU ${__VU}: Slow response ${response.timings.duration}ms, Status: ${response.status}`);
    }

    errorRate.add(!success);
    sleep(1); // Same sleep as working test
}

export function teardown(data) {
    console.log('🏁 Spike test with 50 concurrent users completed!');
    console.log('📊 Check the results above to see how your API handled the load spike');
}
