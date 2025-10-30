const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();

// Enable CORS first
app.use(cors());

// Parse JSON bodies - MUST be after CORS
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const API_BASE_URL = 'https://gqcz28l0t2.execute-api.us-east-1.amazonaws.com/dev';
const API_KEY = 'TTWy409iie9ozE5vIW5rOhZSe3ZC3OU4hYDjQJOd';

// Proxy endpoint
app.post('/api/:endpoint', async (req, res) => {
    try {
        const endpoint = req.params.endpoint;
        
        // Map frontend endpoint names to actual API endpoints
        const endpointMap = {
            'analyze': 'analyze',
            'redact': 'redact',
            'report': 'generate-report',
            'drill': 'simulate-drill'
        };
        
        const actualEndpoint = endpointMap[endpoint] || endpoint;
        const apiUrl = `${API_BASE_URL}/${actualEndpoint}`;
        
        console.log(`[Proxy] ${endpoint} -> ${actualEndpoint}`);
        console.log(`[Proxy] URL: ${apiUrl}`);
        console.log(`[Proxy] Body:`, req.body);
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY
            },
            body: JSON.stringify(req.body)
        });

        console.log(`[Proxy] Response status: ${response.status}`);
        
        const data = await response.json();
        console.log(`[Proxy] Response data:`, data);
        
        res.json(data);
    } catch (error) {
        console.error('[Proxy] Error:', error);
        res.status(500).json({ error: error.message, details: error.toString() });
    }
});

app.listen(3000, () => {
    console.log('CORS proxy running on http://localhost:3000');
});