// State
let players = [];
let captains = []; // { name, budget, team: [], id }
let unsoldPlayers = [];
let currentPool = 'main'; // 'main' or 'unsold'
let currentRolledPlayer = null;
let currentBid = 0;
let currentLeaderIndex = -1;
let baseBudget = 100;
let maxPlayersPerTeam = 0;

// DOM Elements
const views = {
    setup: document.getElementById('setup-view'),
    auction: document.getElementById('auction-view')
};

const setupUI = {
    playerInput: document.getElementById('player-input'),
    baseBudgetInput: document.getElementById('base-budget'),
    processBtn: document.getElementById('process-players-btn'),
    captainArea: document.getElementById('captain-selection-area'),
    captainsList: document.getElementById('potential-captains-list'),
    startBtn: document.getElementById('start-auction-btn')
};

const auctionUI = {
    spotlightName: document.getElementById('player-display'),
    rollBtn: document.getElementById('roll-btn'),
    soldBtn: document.getElementById('sold-btn'),
    unsoldBtn: document.getElementById('unsold-btn'),
    teamsContainer: document.getElementById('teams-container'),
    unsoldCount: document.getElementById('unsold-count'),
    remainingCount: document.getElementById('remaining-count'),
    bidInfo: document.getElementById('bid-info'),
    currentBid: document.getElementById('current-bid'),
    currentLeader: document.getElementById('current-leader'),
    manualAssignArea: document.getElementById('manual-assign-area'),
    assignSelect: document.getElementById('assign-team-select'),
    forceAssignBtn: document.getElementById('force-assign-btn')
};

// Initialization
setupUI.processBtn.addEventListener('click', processPlayerList);
setupUI.startBtn.addEventListener('click', startAuction);
auctionUI.rollBtn.addEventListener('click', rollPlayer);
auctionUI.soldBtn.addEventListener('click', sellPlayer);
auctionUI.unsoldBtn.addEventListener('click', passPlayer);
auctionUI.forceAssignBtn.addEventListener('click', forceAssignPlayer);

function processPlayerList() {
    const rawText = setupUI.playerInput.value;
    const names = rawText.split('\n').map(n => n.trim()).filter(n => n.length > 0);

    if (names.length < 2) {
        alert("Please enter at least 2 players.");
        return;
    }

    players = names;
    baseBudget = parseInt(setupUI.baseBudgetInput.value) || 100;

    // Render Captain Selection
    setupUI.captainArea.classList.remove('hidden');
    renderCaptainSelection();
}

function renderCaptainSelection() {
    setupUI.captainsList.innerHTML = '';

    // Sort players alphabetically for easier finding
    [...players].sort().forEach(player => {
        const tag = document.createElement('div');
        tag.className = 'name-tag';
        tag.textContent = player;
        tag.onclick = () => toggleCaptain(player, tag);
        setupUI.captainsList.appendChild(tag);
    });
}

function toggleCaptain(name, tagElement) {
    // If already a captain, remove
    const capIndex = captains.findIndex(c => c.name === name);
    if (capIndex > -1) {
        captains.splice(capIndex, 1);
        tagElement.classList.remove('selected');
    } else {
        // Add as captain
        captains.push({
            name: name,
            budget: baseBudget,
            team: [],
            id: Date.now() + Math.random()
        });
        tagElement.classList.add('selected');
    }
}

function startAuction() {
    if (captains.length < 2) {
        alert("Please select at least 2 captains.");
        return;
    }

    // Remove captains from the main player pool
    players = players.filter(p => !captains.find(c => c.name === p));

    const totalParticipants = players.length + captains.length;
    // Calculation: ceil(Total / Captains). e.g. 5 players, 2 captains = 7 total. 7/2 = 3.5 -> 4 max per team?
    // Actually, "players list" usually excludes captains in this app flow (captains are picked FROM list or separate).
    // Let's assume Total Items = (Remaining Players + Captains).
    // User wants "equal no of player". 
    // If 10 items total, 2 teams -> 5 each.
    // If 11 items total, 2 teams -> 6 each (one has 5, one 6).
    maxPlayersPerTeam = Math.ceil(totalParticipants / captains.length);

    console.log(`Total: ${totalParticipants}, Capts: ${captains.length}, MaxPerTeam: ${maxPlayersPerTeam}`);

    // Alert if low
    if (Math.floor(totalParticipants / captains.length) <= 3) {
        // "numbers are low like 2 or 3"
        const proceed = confirm(`Teams will be small (approx ${Math.floor(totalParticipants / captains.length)} players/team). Shall we proceed?`);
        if (!proceed) return;
    }

    if (players.length === 0) {
        alert("No players left to auction! Please add more players.");
        return;
    }

    // Switch Views
    views.setup.classList.add('hidden');
    views.auction.classList.remove('hidden');

    updateStats();
    renderTeams();
}

// Auction Logic
function updateStats() {
    auctionUI.unsoldCount.textContent = unsoldPlayers.length;
    auctionUI.remainingCount.textContent = players.length;
}

function renderTeams() {
    auctionUI.teamsContainer.innerHTML = '';

    captains.forEach((cap, index) => {
        const card = document.createElement('div');
        card.className = `team-card ${index === currentLeaderIndex ? 'active-bidder' : ''}`;

        // Check if buttons should be disabled
        const isBiddingActive = currentRolledPlayer !== null;
        const isFull = (cap.team.length + 1) >= maxPlayersPerTeam;

        const canBid5 = isBiddingActive && !isFull && cap.budget >= (currentBid + 5);
        const canBid10 = isBiddingActive && !isFull && cap.budget >= (currentBid + 10);
        const canBid15 = isBiddingActive && !isFull && cap.budget >= (currentBid + 15);
        const canBid20 = isBiddingActive && !isFull && cap.budget >= (currentBid + 20);

        card.innerHTML = `
            <div class="team-header">
                <span class="team-name">${cap.name} ${isFull ? '<span style="color:red; font-size:0.8em">(Full)</span>' : ''}</span>
                <span class="team-points">${cap.budget} pts</span>
            </div>
            <div class="bid-controls">
                <button class="bid-btn" ${!canBid5 ? 'disabled' : ''} onclick="placeBid(${index}, 5)">+5</button>
                <button class="bid-btn" ${!canBid10 ? 'disabled' : ''} onclick="placeBid(${index}, 10)">+10</button>
                <button class="bid-btn" ${!canBid15 ? 'disabled' : ''} onclick="placeBid(${index}, 15)">+15</button>
                <button class="bid-btn" ${!canBid20 ? 'disabled' : ''} onclick="placeBid(${index}, 20)">+20</button>
            </div>
            <div class="team-roster">
                ${cap.team.map(p => `
                    <div class="roster-item">
                        <span>${p.name}</span>
                        <span class="roster-price">${p.cost}</span>
                    </div>
                `).join('')}
            </div>
        `;
        auctionUI.teamsContainer.appendChild(card);
    });
}

function rollPlayer() {
    // Check if we need to switch to unsold pool
    if (players.length === 0) {
        if (unsoldPlayers.length > 0) {
            const confirmSwitch = confirm("Main list empty. Switch to Unsold list?");
            if (confirmSwitch) {
                players = [...unsoldPlayers];
                unsoldPlayers = []; // Reset unsold, they are now active pool
                currentPool = 'unsold';
                updateStats();
            } else {
                return;
            }
        } else {
            alert("Auction Completed! All lists empty.");
            return;
        }
    }

    // Disable Roll, Reset State
    auctionUI.rollBtn.disabled = true;
    auctionUI.soldBtn.classList.add('hidden');
    auctionUI.unsoldBtn.classList.add('hidden');
    auctionUI.bidInfo.classList.add('hidden');
    auctionUI.manualAssignArea.classList.add('hidden'); // Ensure hidden at start
    currentBid = 0;
    currentLeaderIndex = -1;
    updateBidDisplay();

    // Animation
    let duration = 2000;
    let interval = 100;
    let startTime = Date.now();
    auctionUI.spotlightName.classList.add('animate-roll');

    const animInterval = setInterval(() => {
        const rIndex = Math.floor(Math.random() * players.length);
        auctionUI.spotlightName.textContent = players[rIndex];

        if (Date.now() - startTime > duration) {
            clearInterval(animInterval);
            finalizeRoll();
        }
    }, interval);
}

function finalizeRoll() {
    // Actually pick a player
    const rIndex = Math.floor(Math.random() * players.length);
    currentRolledPlayer = players[rIndex];
    auctionUI.spotlightName.textContent = currentRolledPlayer;
    auctionUI.spotlightName.classList.remove('animate-roll');

    // Enable Controls
    auctionUI.soldBtn.classList.remove('hidden');
    auctionUI.unsoldBtn.classList.remove('hidden');
    auctionUI.bidInfo.classList.remove('hidden');

    // Show Manual Assignment
    auctionUI.manualAssignArea.classList.remove('hidden');

    // Populate select with captains who have space
    auctionUI.assignSelect.innerHTML = '<option value="">-- Assign To --</option>';
    captains.forEach((cap, index) => {
        // Include captain in count
        if ((cap.team.length + 1) < maxPlayersPerTeam) {
            const opt = document.createElement('option');
            opt.value = index;
            opt.textContent = cap.name;
            auctionUI.assignSelect.appendChild(opt);
        }
    });

    // Re-render teams to enable buttons
    renderTeams();
}

function placeBid(captainIndex, amount) {
    if (!currentRolledPlayer) return;

    const newBid = currentBid + amount;

    if (captains[captainIndex].budget < newBid) {
        alert("Not enough budget!");
        return;
    }

    currentBid = newBid;
    currentLeaderIndex = captainIndex;

    updateBidDisplay();
    renderTeams(); // Update highlight and disable buttons if budget exceeded
}

function updateBidDisplay() {
    auctionUI.currentBid.textContent = currentBid;
    auctionUI.currentLeader.textContent = currentLeaderIndex > -1 ? captains[currentLeaderIndex].name : "None";
}

function sellPlayer() {
    if (currentLeaderIndex === -1) {
        alert("No one has bid on this player yet! Pass the player or place a bid.");
        return;
    }

    const winner = captains[currentLeaderIndex];
    const player = currentRolledPlayer;
    const cost = currentBid;

    // Deduct points
    winner.budget -= cost;
    winner.team.push({ name: player, cost: cost });

    // Remove from active pool
    players = players.filter(p => p !== player);

    resetTurn();
}

function passPlayer() {
    if (!currentRolledPlayer) return;

    // Add to unsold
    unsoldPlayers.push(currentRolledPlayer);

    // Remove from active pool
    players = players.filter(p => p !== currentRolledPlayer);

    resetTurn();
}

function forceAssignPlayer() {
    if (!currentRolledPlayer) return;

    const selectedIndex = auctionUI.assignSelect.value;
    if (selectedIndex === "") {
        alert("Please select a team to assign to.");
        return;
    }

    const capIndex = parseInt(selectedIndex);
    const winner = captains[capIndex];

    // Confirm Action
    if (!confirm(`Assign ${currentRolledPlayer} to ${winner.name} for 0 cost?`)) {
        return;
    }

    // Assign without cost
    winner.team.push({ name: currentRolledPlayer, cost: 0 }); // 0 cost assignment

    // Remove from active pool
    players = players.filter(p => p !== currentRolledPlayer);

    resetTurn();
}

function resetTurn() {
    // Reset UI common logic
    currentRolledPlayer = null;
    currentBid = 0;
    currentLeaderIndex = -1;

    auctionUI.rollBtn.disabled = false;
    auctionUI.soldBtn.classList.add('hidden');
    auctionUI.unsoldBtn.classList.add('hidden');
    auctionUI.bidInfo.classList.add('hidden');
    auctionUI.manualAssignArea.classList.add('hidden');
    auctionUI.spotlightName.textContent = "READY";

    updateStats();
    renderTeams();
}
