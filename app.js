const SUPABASE_URL = 'https://supabase.com/dashboard/project/ejnbetqywcyukrtwetjt';
const SUPABASE_KEY = 'sb_publishable_P-sn36PRhmvlUVlQrpXBCw_ThF-dgWZ';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function caricaGiocatrici() {
    // 1. Chiediamo i dati alla tabella 'calciatrici'
    const { data, error } = await _supabase
        .from('calciatrici')
        .select('*')
        .order('quotazione', { ascending: false }); // Ordina dalle più care

    if (error) {
        console.error("Errore nel recupero:", error);
        return;
    }

    // 2. Togliamo la scritta "Caricamento"
    document.getElementById('loading').style.display = 'none';

    // 3. Stampiamo i dati nella pagina
    const contenitore = document.getElementById('lista-calciatrici');
    
    data.forEach(giocatrice => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <h3>${giocatrice.nome}</h3>
            <p>Squadra: <strong>${giocatrice.squadra}</strong></p>
            <p>Ruolo: ${giocatrice.ruolo}</p>
            <p>Prezzo: 💰${giocatrice.quotazione}</p>
            <button onclick="seleziona('${giocatrice.nome}')">Aggiungi</button>
        `;
        contenitore.appendChild(card);
    });
}

function seleziona(nome) {
    alert("Hai selezionato: " + nome);
}

// Avviamo la funzione al caricamento della pagina
caricaGiocatrici();