// Improved server connection, error handling, and retry logic
function connectToServer(url) {
    let attempts = 0;
    const maxAttempts = 5;

    function tryConnect() {
        return new Promise((resolve, reject) => {
            // Simulate server connection
            console.log(`Attempting to connect to ${url} (Attempt ${attempts + 1})`);
            // Simulated connection logic here
            const success = Math.random() > 0.5; // Random success for demo

            if (success) {
                resolve("Connected to server");
            } else {
                reject(new Error("Connection failed"));
            }
        });
    }

    return new Promise((resolve, reject) => {
        function attemptConnection() {
            attempts++;
            tryConnect().then(resolve).catch((error) => {
                if (attempts < maxAttempts) {
                    console.log(error.message);
                    console.log(`Retrying in ${attempts} seconds...`);
                    setTimeout(attemptConnection, attempts * 1000);
                } else {
                    reject(new Error(`Failed to connect after ${maxAttempts} attempts`));
                }
            });
        }
        attemptConnection();
    });
}

// Example usage
connectToServer('https://example.com').then(console.log).catch(console.error);