
import axios from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';

const jar = new CookieJar();
const client = wrapper(axios.create({ jar, baseURL: 'http://localhost:3001' }));

async function run() {
    try {
        // 1. Login
        console.log("Logging in...");
        await client.post('/api/login', {
            username: 'mohsen',
            password: 'Aa@0555252341'
        });
        console.log("Logged in.");

        // 2. Create Institution
        console.log("Creating institution...");
        const instRes = await client.post('/api/institutions', {
            name: 'Test Inst ' + Date.now(),
            owner: 'Test Owner',
            mobile: '0500000000',
            activity: 'Test',
            email: 'test@test.com'
        });
        const instId = instRes.data.id;
        console.log("Institution created with ID:", instId);

        // 3. Add Violation
        console.log("Adding violation...");
        const formData = new FormData();
        formData.append('violation_number', 'V-123');
        formData.append('authority', 'Municipality');
        formData.append('amount', '1000');
        formData.append('violation_date', '2023-01-01');
        formData.append('objection_start_date', '2023-01-02');
        formData.append('objection_end_date', '2023-01-10');

        // Note: Node environment FormData handling with axios might need special headers or 'form-data' package
        // But since server expects multipart/form-data, we can try simply passing object if not using files? 
        // No, server uses multer, so it expects multipart.
        // In node, we usually need 'form-data' package. But let's try JSON first if multer accepts it? 
        // Multer strictly processes multipart. The body will be empty if we send JSON.
        // So we must use form-data.
    } catch (err) {
        console.error("Error:", err.response?.data || err.message);
    }
}

// Rewriting to use 'form-data' package logic manually or just use a helper if possible without installing new deps.
// Since 'form-data' might not be installed, I'll try to use a simpler approach or install it if needed.
// 'axios' is likely installed. 'form-data' is usually a dependency of axios for node? No, axios uses follow-redirects etc.
// Let's assume 'form-data' is available or I can mock it.
// Actually, 'wallet-backend' has 'multer' so it might have 'form-data' in node_modules? No.
// I will try to use `fetch` (native in Node 18+) or just modify the server temporarily to debug.
// WAIT. I can just check the server logs! The user has the server running.
// I can view the terminal output of `wallet-backend`!

