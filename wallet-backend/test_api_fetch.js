
const BASE_URL = 'http://localhost:3001';

async function run() {
    try {
        // 1. Login
        console.log("Logging in...");
        const loginRes = await fetch(`${BASE_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'mohsen', password: 'Aa@0555252341' })
        });

        if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status}`);

        // Get cookies
        const cookie = loginRes.headers.get('set-cookie');
        const headers = {
            'Cookie': cookie,
            // 'Content-Type': 'application/json' // Will set this dynamically
        };

        console.log("Logged in. Cookie:", cookie);

        // 2. Create Institution (using JSON)
        console.log("Creating institution...");
        const instRes = await fetch(`${BASE_URL}/api/institutions`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test Inst ' + Date.now(),
                owner: 'Test Owner',
                mobile: '0500000000',
                activity: 'Test',
                email: 'test@test.com'
            })
        });

        if (!instRes.ok) {
            console.log(await instRes.text());
            throw new Error(`Create Inst failed: ${instRes.status}`);
        }

        const instData = await instRes.json();
        const instId = instData.id;
        console.log("Institution created with ID:", instId);

        // 3. Add Violation (using FormData)
        console.log("Adding violation...");
        const formData = new FormData();
        formData.append('violation_number', 'V-123');
        formData.append('authority', 'Municipality');
        formData.append('amount', '1000');
        formData.append('violation_date', '2023-01-01');
        formData.append('objection_start_date', '2023-01-02');
        formData.append('objection_end_date', '2023-01-10');
        formData.append('notes', 'Test note');
        // We don't append validation_article to see if it fails without it? 
        // Or we append it as expected.
        formData.append('violation_article', 'Article 1');

        const vioRes = await fetch(`${BASE_URL}/api/institutions/${instId}/violations`, {
            method: 'POST',
            headers: { ...headers }, // fetch automatically sets Content-Type for FormData
            body: formData
        });

        console.log("Violation Status:", vioRes.status);
        const text = await vioRes.text();
        console.log("Response:", text);

    } catch (err) {
        console.error("Script Error:", err);
    }
}

run();
