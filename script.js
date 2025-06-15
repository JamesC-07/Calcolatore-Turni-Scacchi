let row = document.querySelectorAll(".playerRow");
let players = [];

row.forEach
(row => 
    {
    const name = row.querySelector(".playerName").value.trim();
    const elo = row.querySelector(".playerElo").value.trim();
    players.push({ name: name, elo: Number(elo) });
    }
);

document.getElementById("addRow").addEventListener("click", () => 
    {
    const playerList = document.getElementById("playerList");
    const newRow = document.createElement("div");
    newRow.className = "playerRow";
    newRow.innerHTML = `
        <input type="text" placeholder="Nome giocatore" class="playerName">
        <input type="number" placeholder="Punteggio Elo" class="playerElo">
    `;
    playerList.appendChild(newRow);
    }
);

document.getElementById("cancelAll").addEventListener("click", () => 
    {
    location.reload();
    }
);

document.getElementById("creaTurni").addEventListener("click", () => 
{
    const rows = document.querySelectorAll(".playerRow");
    const players = [];

    rows.forEach(row => 
    {
        const name = row.querySelector(".playerName").value.trim();
        const elo = row.querySelector(".playerElo").value.trim();

        if (name && elo) 
        {
            players.push({ name, elo: Number(elo) });
        }
    }
    );

    players.sort((a, b) => b.elo - a.elo);

    const resultsDiv = document.getElementById("results");
    resultsDiv.innerHTML = "";

    const table = document.createElement("table");
    const headerRow = document.createElement("tr");
    headerRow.innerHTML = `
        <th>Posizione</th>
        <th>Nome</th>
        <th>Elo</th>
    `;
    table.appendChild(headerRow);

    players.forEach((player, index) => 
    {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${player.name}</td>
            <td>${player.elo}</td>
        `;
        table.appendChild(row);
    }
    );
    resultsDiv.appendChild(table);

    const turni = generaTurni(players);
    mostraTurni(turni);
});


/* LOGICA DEI TURNI DA MIGLIORARE
TODO: Aggiungere due variabili "punteggioTorneo" e "punteggio di spareggio" nella logica della creazione della classifica.
TODO: Mettere tutta la logica della classifica in un metodo separato.
*/

function generaTurni(players) {
    const turni = [];

    const playerList = [...players]; 
    if (playerList.length % 2 !== 0) {
        playerList.push({ name: "BYE", elo: 0 });
    }

    for (let i = 0; i < playerList.length; i += 2) {
        turni.push({
            bianco: playerList[i].name,
            nero: playerList[i + 1].name
        });
    }

    return turni;
}

function mostraTurni(turni) {
    const resultsDiv = document.getElementById("results");

    const turniHeader = document.createElement("h2");
    turniHeader.textContent = "Turni del torneo";
    resultsDiv.appendChild(turniHeader);

    const ul = document.createElement("ul");
    turni.forEach(match => {
        const li = document.createElement("li");
        li.textContent = `${match.bianco} vs ${match.nero}`;
        ul.appendChild(li);
    });

    resultsDiv.appendChild(ul);
}



