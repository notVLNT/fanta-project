const SUPABASE_URL = 'https://ejnbetqywcyukrtwetjt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_P-sn36PRhmvlUVlQrpXBCw_ThF-dgWZ';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let budget = 250;
let slotSelezionatoId = null; 
let ruoloSelezionato = null;
let miaSquadraIds = [];

function acquista(id, nome, prezzo) {
    if (miaSquadraIds.includes(id)) {
        alert("Hai già questa calciatrice in squadra!");
        return;
    }
    
    // ... resto del codice di acquisto ...
    miaSquadraIds.push(id); 
}

// 3. FUNZIONE PRINCIPALE: APRI MERCATO
// Viene chiamata dai "+" sul campo (es: onclick="apriMercato('D', 'd-1')")
async function apriMercato(ruolo, idSlot) {
    slotSelezionatoId = idSlot;
    ruoloSelezionato = ruolo;

    // Feedback visivo: diciamo all'utente che stiamo caricando
    const contenitoreLista = document.getElementById('lista-calciatrici');
    contenitoreLista.innerHTML = '<p class="loading">Cercando ' + ruolo + ' disponibili...</p>';

    // Chiamata a Supabase filtrata per ruolo
    const { data, error } = await _supabase
        .from('calciatrici')
        .select('*')
        .eq('ruolo', ruolo)
        .order('quotazione', { ascending: false });

    if (error) {
        console.error("Errore Supabase:", error);
        return;
    }

    mostraCalciatriciInLista(data);
}

// 4. FUNZIONE: MOSTRA CALCIATRICI NELLA LISTA SOTTO IL CAMPO
function mostraCalciatriciInLista(calciatrici) {
    const contenitore = document.getElementById('lista-calciatrici');
    contenitore.innerHTML = `<h3>Mercato: ${ruoloSelezionato}</h3>`;

    if (calciatrici.length === 0) {
        contenitore.innerHTML += "<p>Nessuna giocatrice trovata.</p>";
        return;
    }

    calciatrici.forEach(g => {
        const card = document.createElement('div');
        card.className = 'card-mercato';
        card.innerHTML = `
            <div class="info">
                <strong>${g.nome}</strong> - ${g.squadra}
                <span class="price">💰${g.quotazione}</span>
            </div>
            <button onclick="acquista('${g.nome}', ${g.quotazione})">Compra</button>
        `;
        contenitore.appendChild(card);
    });
}

// 5. FUNZIONE: ACQUISTA E METTI SUL CAMPO
function acquista(nome, prezzo) {
    if (budget < prezzo) {
        alert("Budget insufficiente! Scegli una giocatrice più economica.");
        return;
    }

    // Sottrai budget
    budget -= prezzo;
    document.getElementById('display-budget').innerText = `Budget: ${budget} 💰`;

    // Aggiorna lo slot sul campo
    const slot = document.getElementById(slotSelezionatoId);
    
    // Prendiamo solo il cognome per non rompere il layout del cerchietto
    const cognome = nome.split(' ').pop();
    slot.innerText = cognome;
    slot.classList.add('filled');
    
    // Pulizia: svuotiamo la lista mercato dopo l'acquisto
    document.getElementById('lista-calciatrici').innerHTML = '';
    
    console.log(`Acquistata ${nome}. Budget residuo: ${budget}`);
}
