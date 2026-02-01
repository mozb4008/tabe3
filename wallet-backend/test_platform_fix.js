
import axios from 'axios';

const API_URL = 'http://127.0.0.1:3001/api';

async function testPlatformUpdate() {
    try {
        // 1. Login to get token
        console.log("Logging in...");
        const loginRes = await axios.post(`${API_URL}/login`, {
            username: 'admin',
            password: 'Abd@0562292199'
        });

        const cookie = loginRes.headers['set-cookie'];
        console.log("Login successful, cookie received.");

        // 2. Fetch current platform info
        const currentInfo = await axios.get(`${API_URL}/platform`);
        console.log("Current Info:", currentInfo.data);

        // 3. Update platform info (without file first)
        console.log("Updating platform info...");
        const updateRes = await axios.post(`${API_URL}/platform`,
            { name: "Test Name", description: "Test Description" },
            { headers: { Cookie: cookie } }
        );
        console.log("Update Response:", updateRes.data);

        // 4. Verify update
        const verifiedInfo = await axios.get(`${API_URL}/platform`);
        console.log("Verified Info:", verifiedInfo.data);

        if (verifiedInfo.data.name === "Test Name") {
            console.log("✅ Success: Platform info updated correctly.");
        } else {
            console.log("❌ Failure: Platform info DID NOT update.");
        }
    } catch (err) {
        console.error("Error during test:", err.response?.data || err.message);
    }
}

testPlatformUpdate();
