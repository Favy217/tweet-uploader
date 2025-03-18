if (typeof ethers === "undefined") {
    console.error("Ethers.js is not loaded. Check the script tag in HTML.");
    document.getElementById("status").textContent = "Error: Ethers.js failed to load.";
} else {
    const contractAddress = "0x9e645b70B763E4C6BaE20F09E4C2C035D56c79ce"; 
    const contractABI = [
        "function recordTweet(string memory _tweetUrl, string memory _discordUsername) external",
        "function getUserRecords(address _user) view returns (tuple(string tweetUrl, uint256 timestamp, address user, string discordUsername)[])",
        "function getRecordCount() view returns (uint256)"
    ];

    const SEISMIC_DEVNET = {
        chainId: "0x1404",
        chainName: "Seismic Devnet",
        nativeCurrency: { name: "Seismic Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: ["https://node-2.seismicdev.net/rpc"],
        blockExplorerUrls: ["https://explorer-2.seismicdev.net"]
    };

    let provider = new ethers.providers.Web3Provider(window.ethereum);
    let contract = new ethers.Contract(contractAddress, contractABI, provider);
    let connected = false;
    let discordUsername = null;

    const status = document.getElementById("status");
    const connectWalletButton = document.getElementById("connectWallet");
    const connectedAddress = document.getElementById("connectedAddress");
    const disconnectWalletButton = document.getElementById("disconnectWallet");
    const connectDiscordButton = document.getElementById("connectDiscord");
    const discordStatus = document.getElementById("discordStatus");
    const uploadSection = document.getElementById("uploadSection");
    const tweetUrlInput = document.getElementById("tweetUrl");
    const uploadTweetButton = document.getElementById("uploadTweet");
    const recordsDiv = document.getElementById("records");
    const discordSearch = document.getElementById("discordSearch");
    const suggestionsDiv = document.getElementById("suggestions");

    let connectedDiscordUsers = []; // Store unique connected Discord usernames

    async function ensureSeismicDevnet() {
        const network = await provider.getNetwork();
        console.log("Current network:", network.chainId);
        if (network.chainId !== 5124) {
            try {
                await provider.send("wallet_switchEthereumChain", [{ chainId: SEISMIC_DEVNET.chainId }]);
            } catch (switchError) {
                if (switchError.code === 4902) {
                    await provider.send("wallet_addEthereumChain", [SEISMIC_DEVNET]);
                } else {
                    throw switchError;
                }
            }
            provider = new ethers.providers.Web3Provider(window.ethereum);
            contract = new ethers.Contract(contractAddress, contractABI, provider);
        }
    }

    async function updateRecords() {
        if (!connected) return;
        const signer = provider.getSigner();
        const userAddress = await signer.getAddress();
        const records = await contract.getUserRecords(userAddress);
        recordsDiv.innerHTML = "";
        connectedDiscordUsers = [...new Set(records.map(record => record.discordUsername).filter(username => username))]; // Update unique usernames
        records.forEach(record => {
            const recordDiv = document.createElement("div");
            recordDiv.className = "tweet-record";
            recordDiv.innerHTML = `
                <p><a href="${record.tweetUrl}" target="_blank">${record.tweetUrl}</a></p>
                <p>Timestamp: ${new Date(record.timestamp * 1000).toLocaleString()}</p>
                <p>Uploaded by Discord: ${record.discordUsername || "N/A"}</p>
            `;
            recordsDiv.appendChild(recordDiv);
        });
    }

    if (connectWalletButton) {
        connectWalletButton.addEventListener("click", async () => {
            try {
                console.log("Attempting to connect wallet...");
                status.textContent = "Connecting...";
                const accounts = await provider.send("eth_requestAccounts", []);
                console.log("Accounts received:", accounts);
                await ensureSeismicDevnet();
                const signer = provider.getSigner();
                const userAddress = await signer.getAddress();
                console.log("Connected address:", userAddress);
                connectWalletButton.classList.add("hidden");
                connectedAddress.textContent = truncateAddress(userAddress);
                connectedAddress.classList.remove("hidden");
                disconnectWalletButton.classList.remove("hidden");
                uploadSection.classList.remove("hidden");
                connected = true;
                status.textContent = "";
                updateRecords();
            } catch (error) {
                console.error("Connect error:", error);
                status.textContent = `Error: ${error.message}`;
            }
        });
    }

    if (connectDiscordButton) {
        connectDiscordButton.addEventListener("click", () => {
            const clientId = "1351502580118720522"; // Discord Client ID
            const redirectUri = "https://tweet-uploader.vercel.app/callback.html"; // redirect URI
            const oauthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify`;
            const popup = window.open(oauthUrl, "DiscordAuth", "width=600,height=700");
            if (!popup) {
                status.textContent = "Error: Popup blocked. Please allow popups for this site.";
            }
        });
    }

    window.addEventListener('message', (event) => {
        if (event.data.discordUsername) {
            discordUsername = event.data.discordUsername;
            discordStatus.textContent = `Connected Discord: ${discordUsername}`;
            discordStatus.classList.remove("hidden");
            connectDiscordButton.classList.add("hidden"); // Hide the button after connection
            status.textContent = ""; // Clear any previous status messages
        }
    });

    disconnectWalletButton.addEventListener("click", () => {
        connected = false;
        connectWalletButton.classList.remove("hidden");
        connectedAddress.classList.add("hidden");
        disconnectWalletButton.classList.add("hidden");
        uploadSection.classList.add("hidden");
        recordsDiv.innerHTML = "";
        status.textContent = "Disconnected";
        discordUsername = null; // Reset Discord connection
        discordStatus.textContent = "";
        discordStatus.classList.add("hidden");
        connectDiscordButton.classList.remove("hidden"); // Show the button again
    });

    uploadTweetButton.addEventListener("click", async () => {
        try {
            const tweetUrl = tweetUrlInput.value.trim();
            if (!tweetUrl) {
                status.textContent = "Please enter a tweet URL";
                return;
            }
            if (!discordUsername) {
                status.textContent = "Please connect your Discord account first";
                return;
            }
            status.textContent = "Uploading tweet...";
            const signer = provider.getSigner();
            const nonce = await provider.getTransactionCount(signer.getAddress(), "pending");
            const contractWithSigner = contract.connect(signer);
            const gasEstimate = await contractWithSigner.estimateGas.recordTweet(tweetUrl, discordUsername);
            const tx = await contractWithSigner.recordTweet(tweetUrl, discordUsername, {
                gasLimit: gasEstimate.mul(2).toString(),
                nonce: nonce
            });
            const receipt = await tx.wait();
            console.log("Transaction hash:", tx.hash);
            console.log("Transaction receipt:", receipt);
            status.textContent = "Tweet recorded!";
            tweetUrlInput.value = "";
            updateRecords();
        } catch (error) {
            console.error("Upload error:", error);
            if (error.code === "CALL_EXCEPTION" && error.reason) {
                status.textContent = `Error: Transaction failed. Reason: ${error.reason}`;
            } else if (error.code === "CALL_EXCEPTION" && error.data) {
                try {
                    const iface = new ethers.utils.Interface(contractABI);
                    const decodedError = iface.parseError(error.data);
                    status.textContent = `Error: Transaction failed. Reason: ${decodedError.name} - ${decodedError.args.join(", ")}`;
                } catch (decodeError) {
                    status.textContent = `Error: Transaction failed. Could not decode reason. Details: ${error.message}`;
                }
            } else {
                status.textContent = `Error: ${error.message || error.toString()}`;
            }
        }
    });

    function truncateAddress(addr) {
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    }

    // Search functionality
    discordSearch.addEventListener("input", () => {
        const query = discordSearch.value.toLowerCase();
        suggestionsDiv.innerHTML = "";
        if (query && connectedDiscordUsers.length > 0) {
            const filteredUsers = connectedDiscordUsers.filter(user => user.toLowerCase().startsWith(query));
            if (filteredUsers.length > 0) {
                filteredUsers.forEach(user => {
                    const div = document.createElement("div");
                    div.className = "suggestion-item";
                    div.textContent = user;
                    div.addEventListener("click", () => {
                        discordSearch.value = user;
                        suggestionsDiv.innerHTML = "";
                        displayUserRecords(user);
                    });
                    suggestionsDiv.appendChild(div);
                });
            } else {
                const div = document.createElement("div");
                div.className = "suggestion-item";
                div.textContent = "No matching users";
                suggestionsDiv.appendChild(div);
            }
        }
    });

    discordSearch.addEventListener("blur", () => {
        setTimeout(() => suggestionsDiv.innerHTML = "", 200); // Hide suggestions when focus is lost
    });

    async function displayUserRecords(discordUser) {
        recordsDiv.innerHTML = "";
        if (!connected) return;
        const allRecords = await contract.getUserRecords(provider.getSigner().getAddress()); // Fetch all records
        const userRecords = allRecords.filter(record => record.discordUsername === discordUser);
        if (userRecords.length > 0) {
            userRecords.forEach(record => {
                const recordDiv = document.createElement("div");
                recordDiv.className = "tweet-record";
                recordDiv.innerHTML = `
                    <p><a href="${record.tweetUrl}" target="_blank">${record.tweetUrl}</a></p>
                    <p>Timestamp: ${new Date(record.timestamp * 1000).toLocaleString()}</p>
                    <p>Uploaded by Discord: ${record.discordUsername || "N/A"}</p>
                `;
                recordsDiv.appendChild(recordDiv);
            });
        } else {
            recordsDiv.innerHTML = "<p>No records found for this user.</p>";
        }
    }

    setInterval(updateRecords, 60000); // Update every minute
}
