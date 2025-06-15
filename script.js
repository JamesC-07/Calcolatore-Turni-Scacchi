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
        document.getElementById("addRow").addEventListener("click", () => this.addPlayerRow());
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
                    receivedBye: false
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
    const sorted = this.sortPlayers(players);
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

    for (let i = 0; i < topHalf.length; i++) {
        const p1 = topHalf[i];
        let paired = false;

        for (let j = 0; j < bottomHalf.length; j++) {
            const p2 = bottomHalf[j];
            if (!this.hasBeenPaired(p1, p2)) {
                this.recordPairing(p1, p2);
                rounds.push({
                    bianco: p1,
                    nero: p2,
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
                <td>${player.name}</td>
                <td>${player.elo}</td>
                <td>${player.punteggioTorneo}</td>
                <td>${player.punteggioSpareggio}</td>
            `;
            table.appendChild(row);
        });

        resultsDiv.appendChild(table);
    }

    // Visualizza i turni del torneo
    displayRounds(rounds) {
        const resultsDiv = document.getElementById("results");

        const header = document.createElement("h2");
        header.textContent = `Turno ${this.currentRound + 1}`;
        resultsDiv.appendChild(header);

        const ul = document.createElement("ul");

        rounds.forEach((match, index) => {
            const li = document.createElement("li");
            if (match.nero.name === "BYE") {
            li.textContent = `${match.bianco.name} ha un BYE`;
            } else {
                li.innerHTML = `
                ${match.bianco.name} vs ${match.nero.name}
                <select data-index="${index}">
                    <option value="">Risultato</option>
                    <option value="1-0">${match.bianco.name} vince</option>
                    <option value="0-1">${match.nero.name} vince</option>
                    <option value="½-½">Pareggio</option>
                </select>
            `;
        }

            ul.appendChild(li);
        });

        resultsDiv.appendChild(ul);

        // Add button for next round
        const nextBtn = document.createElement("button");
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

    const round = this.generateRounds(this.players);
    this.rounds.push(round);
    this.displayRounds(round);
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
            white.punteggioSpareggio += black.elo;
        } else if (result === "0-1") {
            black.punteggioTorneo += 1;
            black.punteggioSpareggio += white.elo;
        } else if (result === "½-½") {
            white.punteggioTorneo += 0.5;
            black.punteggioTorneo += 0.5;
            white.punteggioSpareggio += black.elo / 2;
            black.punteggioSpareggio += white.elo / 2;
        }
    });
}

nextRound() {
    this.processResults();

    this.displayRanking(this.players);

    this.currentRound++;
    const newRound = this.generateRounds(this.players);
    this.rounds.push(newRound);

    this.displayRounds(newRound);
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
}



}

document.addEventListener('DOMContentLoaded', () => {
    new TournamentManager();
});
