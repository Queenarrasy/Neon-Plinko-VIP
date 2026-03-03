// Improved server connection handling

class ServerConnection {
    constructor(baseURL) {
        this.baseURL = baseURL;
        this.retryAttempts = 3;
        this.delay = 1000; // Delay in milliseconds
    }

    async fetchData(endpoint, options = {}) {
        let attempts = 0;
        while (attempts < this.retryAttempts) {
            try {
                const response = await fetch(`${this.baseURL}${endpoint}`, options);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return await response.json();
            } catch (error) {
                attempts++;
                console.error(`Attempt ${attempts} failed: ${error.message}`);
                if (attempts < this.retryAttempts) {
                    await this.delayRetry();
                } else {
                    throw new Error('All retry attempts failed.');
                }
            }
        }
    }

    delayRetry() {
        return new Promise(resolve => setTimeout(resolve, this.delay));
    }
}

// Functions for game
async function startGame() {
    const server = new ServerConnection('https://api.example.com');
    try {
        const gameData = await server.fetchData('/start-game');
        console.log('Game started:', gameData);
        // Additional game logic here
    } catch (error) {
        console.error('Error starting game:', error.message);
    }
}

// Deposit function
async function deposit(amount) {
    const server = new ServerConnection('https://api.example.com');
    try {
        const response = await server.fetchData('/deposit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount })
        });
        console.log('Deposit successful:', response);
    } catch (error) {
        console.error('Error during deposit:', error.message);
    }
}

// Withdraw function
async function withdraw(amount) {
    const server = new ServerConnection('https://api.example.com');
    try {
        const response = await server.fetchData('/withdraw', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount })
        });
        console.log('Withdrawal successful:', response);
    } catch (error) {
        console.error('Error during withdrawal:', error.message);
    }
}

// Profile function
async function getProfile(userId) {
    const server = new ServerConnection('https://api.example.com');
    try {
        const profile = await server.fetchData(`/profile/${userId}`);
        console.log('Profile data:', profile);
    } catch (error) {
        console.error('Error fetching profile:', error.message);
    }
}

// Reward function
async function getRewards(userId) {
    const server = new ServerConnection('https://api.example.com');
    try {
        const rewards = await server.fetchData(`/rewards/${userId}`);
        console.log('Reward data:', rewards);
    } catch (error) {
        console.error('Error fetching rewards:', error.message);
    }
}