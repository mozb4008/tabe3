
import axios from 'axios';

async function testLogin() {
    try {
        console.log("Testing login with admin / Abd@0562292199");
        const res = await axios.post('http://127.0.0.1:3001/api/login', {
            username: 'admin',
            password: 'Abd@0562292199'
        });
        console.log("Login Success:", res.data);
    } catch (error) {
        console.error("Login Failed:", error.response ? error.response.data : error.message);
    }
}

testLogin();
