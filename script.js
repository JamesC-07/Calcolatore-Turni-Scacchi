class TournamentManager {
    constructor() {
        this.players = [];
        this.initEventListeners();
        this.rounds = [];
        this.currentRound = 0;
        this.pairHistory = new Set();
    }

    // Inizializza tutti gli event listeners
    initEventListeners() {
        document.getElementById("addRow").addEventListener("click", () => {
            this.addPlayerRow();
            this.displayHalfByeSelection(); // update selector
        });

        document.getElementById("cancelAll").addEventListener("click", () => this.resetTournament());

        document.getElementById("creaTurni").addEventListener("click", () => this.createTournament());
    }


    // Aggiunge una nuova riga per inserire un giocatore
    addPlayerRow() {
        const playerList = document.getElementById("playerList");
        const newRow = document.createElement("div");
        newRow.className = "playerRow";
        newRow.innerHTML = `
            <input type="text" placeholder="Nome giocatore" class="playerName">
            <input type="number" placeholder="Punteggio Elo" class="playerElo">
        `;
        playerList.appendChild(newRow);
        this.displayHalfByeSelection(); // Refresh selector
    }

    // Reset del torneo
    resetTournament() {
        location.reload();
    }

    // Raccoglie i dati dei giocatori dalle righe di input
    collectPlayersData() {
        const rows = document.querySelectorAll(".playerRow");
        const players = [];

        rows.forEach(row => {
            const name = row.querySelector(".playerName").value.trim();
            const elo = row.querySelector(".playerElo").value.trim();

            if (name && elo) {
                players.push({
                    name,
                    elo: Number(elo),
                    punteggioTorneo: 0,
                    punteggioSpareggio: 0,
                    receivedBye: false,
                    halfByeNextRound: row.dataset.halfBye === "true",
                    colorHistory: [] 
                });
            }
        });

        return players;
    }

    // Ordina i giocatori secondo i criteri del torneo
    sortPlayers(players) {
        return [...players].sort((a, b) => {
            // Prima per punteggio torneo
            if (b.punteggioTorneo !== a.punteggioTorneo) {
                return b.punteggioTorneo - a.punteggioTorneo;
            }
            // Poi per punteggio spareggio
            if (b.punteggioSpareggio !== a.punteggioSpareggio) {
                return b.punteggioSpareggio - a.punteggioSpareggio;
            }
            // Infine per Elo
            return b.elo - a.elo;
        });
    }

    // Genera i turni del torneo
    generateRounds(players) {
    // Filter out players with halfByeNextRound = true
    const halfByePlayers = players.filter(p => p.halfByeNextRound);
    halfByePlayers.forEach(p => {
        p.punteggioTorneo += 0.5;
        p.halfByeNextRound = false; // Reset for future rounds
    });

    // Work with the remaining players only
    let sorted = this.sortPlayers(players.filter(p => !halfByePlayers.includes(p)));
    const groups = this.groupByScore(sorted);
    const rounds = [];

    const unpaired = [];

    // Track who already got BYE
    const byeCandidates = sorted.filter(p => !p.receivedBye);
    const totalPlayers = sorted.length;

    // Assign BYE to lowest-ranked player who hasn’t received one
    if (totalPlayers % 2 !== 0) {
        const byePlayer = byeCandidates[byeCandidates.length - 1];
        rounds.push({
            bianco: byePlayer,
            nero: { name: "BYE", elo: 0 },
            risultato: "1-0"
        });
        byePlayer.punteggioTorneo += 1;
        byePlayer.receivedBye = true;
        sorted.splice(sorted.indexOf(byePlayer), 1);
    }

    // Rebuild groups after BYE removal
    const updatedGroups = this.groupByScore(sorted);

for (let scoreGroup of updatedGroups) {
    let group = [...scoreGroup];

    // If odd, float lowest player down
    if (group.length % 2 !== 0) {
        const floater = group.pop();
        unpaired.push(floater);
    }

    const half = group.length / 2;
    const topHalf = group.slice(0, half);
    const bottomHalf = group.slice(half);

    const alternateWhiteStartsWhite = Math.random() < 0.5;

for (let i = 0; i < topHalf.length; i++) {
    const p1 = topHalf[i];
    let paired = false;

    for (let j = 0; j < bottomHalf.length; j++) {
        const p2 = bottomHalf[j];
        if (!this.hasBeenPaired(p1, p2)) {
            this.recordPairing(p1, p2);

            let bianco, nero;

            // Alternate colors starting from random
            if ((i % 2 === 0) === alternateWhiteStartsWhite) {
                bianco = p1;
                nero = p2;
            } else {
                bianco = p2;
                nero = p1;
            }

            bianco.colorHistory.push("white");
            nero.colorHistory.push("black");

            rounds.push({
                bianco,
                nero,
                risultato: null
            });

            bottomHalf.splice(j, 1);
            paired = true;
            break;
        }
    }

    if (!paired) {
        unpaired.push(p1);
    }
}


    // Any leftover from bottomHalf also go to unpaired
    unpaired.push(...bottomHalf);
}


    // Try pairing leftover players from higher score groups with lower
    for (let i = 0; i < unpaired.length; i++) {
        const player1 = unpaired[i];
        for (let j = i + 1; j < unpaired.length; j++) {
            const player2 = unpaired[j];

            if (!this.hasBeenPaired(player1, player2)) {
                this.recordPairing(player1, player2);
                rounds.push({
                    bianco: player1,
                    nero: player2,
                    risultato: null
                });

                unpaired.splice(j, 1);
                unpaired.splice(i, 1);
                i--;
                break;
            }
        }
    }

    return rounds;
}

groupByScore(players) {
    const groups = new Map();

    for (const player of players) {
        const key = player.punteggioTorneo;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(player);
    }

    // Sort by descending score, then sort each group by Elo descending
    return [...groups.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([score, group]) => group.sort((a, b) => b.elo - a.elo));
}



    // Crea e visualizza la classifica iniziale
    displayRanking(players) {
        const sorted = this.sortPlayers(players);
        const resultsDiv = document.getElementById("results");
        resultsDiv.innerHTML = "";

        const table = document.createElement("table");
        const headerRow = document.createElement("tr");
        headerRow.innerHTML = `
            <th>Posizione</th>
            <th>Nome</th>
            <th>Elo</th>
            <th>Punti</th>
            <th>Spareggio</th>
        `;
        table.appendChild(headerRow);

        sorted.forEach((player, index) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${index + 1}</td>
                <td><a href="#" class="playerLink" data-name="${player.name}">${player.name}</a></td>
                <td>${player.elo}</td>
                <td>${player.punteggioTorneo}</td>
                <td>${player.punteggioSpareggio}</td>
            `;
            table.appendChild(row);
        });
        resultsDiv.appendChild(table);
        document.querySelectorAll(".playerLink").forEach(link => {
    link.addEventListener("click", (e) => {
        e.preventDefault();
        const playerName = e.target.dataset.name;
        this.showPlayerDetails(playerName);
    });
});

    }

displayHalfByeSelection() {
    const resultsDiv = document.getElementById("results");
    let old = document.getElementById("halfByeContainer");
    if (old) old.remove();

    const container = document.createElement("div");
    container.id = "halfByeContainer";
    container.className = "halfByeSelector";

    const title = document.createElement("h3");
    title.textContent = "Half bye:";
    container.appendChild(title);

    if (this.players.length > 0) {
        // Tournament started: show from this.players
        this.players.forEach((player, index) => {
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.id = `halfBye-${index}`;
            checkbox.checked = !!player.halfByeNextRound;

            checkbox.addEventListener("change", (e) => {
                player.halfByeNextRound = e.target.checked;
            });

            const label = document.createElement("label");
            label.htmlFor = checkbox.id;
            label.textContent = player.name;

            const line = document.createElement("div");
            line.appendChild(checkbox);
            line.appendChild(label);

            container.appendChild(line);
        });
    } else {
        // Tournament not started: get from playerRows
        const rows = document.querySelectorAll(".playerRow");

        rows.forEach((row, index) => {
            const nameInput = row.querySelector(".playerName");
            const name = nameInput.value.trim();
            if (!name) return;

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.id = `halfBye-${index}`;
            checkbox.checked = row.dataset.halfBye === "true";

            checkbox.addEventListener("change", (e) => {
                row.dataset.halfBye = e.target.checked ? "true" : "false";
            });

            const label = document.createElement("label");
            label.htmlFor = checkbox.id;
            label.textContent = name;

            const line = document.createElement("div");
            line.appendChild(checkbox);
            line.appendChild(label);

            container.appendChild(line);
        });
    }

    resultsDiv.appendChild(container);
}



    // Visualizza i turni del torneo
    displayRounds(rounds) {
        const resultsDiv = document.getElementById("results");

        const header = document.createElement("h2");
        header.textContent = `Turno ${this.currentRound + 1}`;
        resultsDiv.appendChild(header);

const roundContainer = document.createElement("div");
roundContainer.className = "roundContainer";

rounds.forEach((match, index) => {
    const matchCard = document.createElement("div");
    matchCard.className = "matchCard";

    if (match.nero.name === "BYE") {
        matchCard.classList.add("byeCard");
        matchCard.textContent = `${match.bianco.name} ha un BYE`;
    } else {
        matchCard.innerHTML = `
            <div class="playerRowMatch">
                <span class="whitePlayer">${match.bianco.name}</span>
                <span class="vsText">vs</span>
                <span class="blackPlayer">${match.nero.name}</span>
            </div>
            <select data-index="${index}" class="resultSelect">
                <option value="">Risultato</option>
                <option value="1-0">${match.bianco.name} vince</option>
                <option value="0-1">${match.nero.name} vince</option>
                <option value="½-½">Pareggio</option>
            </select>
        `;
    }

    roundContainer.appendChild(matchCard);
});

resultsDiv.appendChild(roundContainer);

// Remove previous button if it exists
const oldButton = document.getElementById("nextRoundButton");
if (oldButton) oldButton.remove();

// Add new button
const nextBtn = document.createElement("button");
nextBtn.id = "nextRoundButton";
nextBtn.className = "next-round-button";
nextBtn.textContent = "Crea turno successivo";
nextBtn.addEventListener("click", () => this.nextRound());
resultsDiv.appendChild(nextBtn);
    }


createTournament() {
    this.players = this.collectPlayersData();
    if (this.players.length === 0) {
        alert("Inserisci almeno un giocatore per creare il torneo.");
        return;
    }

    this.rounds = [];
    this.currentRound = 0;

    this.displayRanking(this.players);
    this.displayHalfByeSelection();

    const round = this.generateRounds(this.players);
    this.rounds.push(round);
    this.displayRounds(round);
}

showPlayerDetails(name) {
    const player = this.players.find(p => p.name === name);
    if (!player) return;

    let html = `<h2>${player.name}</h2>`;
    html += `<p><strong>Elo:</strong> ${player.elo}</p>`;
    html += `<p><strong>Punti torneo:</strong> ${player.punteggioTorneo}</p>`;
    html += `<p><strong>Buchholz:</strong> ${player.punteggioSpareggio}</p>`;

    html += `<h3>Partite:</h3>`;
    if (!player.opponents || player.opponents.length === 0) {
        html += `<p>Nessuna partita ancora.</p>`;
    } else {
        html += `<ul>`;
        player.opponents.forEach((opp, index) => {
            const round = this.rounds
                .flat()
                .find(m => (m.bianco === player && m.nero === opp) || (m.nero === player && m.bianco === opp));
            const color = round.bianco === player ? "Bianco" : "Nero";
            const result = round.risultato || "Non ancora giocata";
            html += `<li>${color} vs ${opp.name} — <strong>${result}</strong></li>`;
        });
        html += `</ul>`;
    }

    document.getElementById("playerDetails").innerHTML = html;
    document.getElementById("playerModal").classList.remove("hidden");

    // Close handler
    document.getElementById("closeModal").onclick = () => {
        document.getElementById("playerModal").classList.add("hidden");
    };
}


    processResults() {
    const selects = document.querySelectorAll("select[data-index]");
    const currentRound = this.rounds[this.currentRound];

    selects.forEach(select => {
        const i = Number(select.dataset.index);
        const result = select.value;
        currentRound[i].risultato = result;

        const match = currentRound[i];
        const white = match.bianco;
        const black = match.nero;

        if (result === "1-0") {
            white.punteggioTorneo += 1;
        } else if (result === "0-1") {
            black.punteggioTorneo += 1;
        } else if (result === "½-½") {
            white.punteggioTorneo += 0.5;
            black.punteggioTorneo += 0.5;
        }
        // Reset spareggio
        this.players.forEach(player => {
            player.punteggioSpareggio = 0;

            if (!player.opponents) player.opponents = [];
            for (const opp of player.opponents) {
                player.punteggioSpareggio += opp.punteggioTorneo;
            }
        });

    });
}

nextRound() {
    this.processResults();

    this.displayRanking(this.players);

    this.currentRound++;
    const newRound = this.generateRounds(this.players);
    this.rounds.push(newRound);

    this.displayRounds(newRound);
    this.displayHalfByeSelection();
}

getPairKey(player1, player2) {
    const names = [player1.name, player2.name].sort();
    return `${names[0]}|${names[1]}`;
}

hasBeenPaired(p1, p2) {
    return this.pairHistory.has(this.getPairKey(p1, p2));
}

recordPairing(p1, p2) {
    this.pairHistory.add(this.getPairKey(p1, p2));

    if (!p1.opponents) p1.opponents = [];
    if (!p2.opponents) p2.opponents = [];

    p1.opponents.push(p2);
    p2.opponents.push(p1);
}

}

document.addEventListener('DOMContentLoaded', () => {
    const tm = new TournamentManager();
    tm.displayHalfByeSelection(); // show initial selector
});
