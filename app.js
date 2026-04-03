// ============================================================
// CONFIGURAZIONE SUPABASE
// ============================================================

const SUPABASE_URL = 'https://ejnbetqywcyukrtwetjt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_P-sn36PRhmvlUVlQrpXBCw_ThF-dgWZ';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================================
// STATO GLOBALE DEL GIOCO
// ============================================================

let statoGioco = {
    utente: null,
    budget: 500,
    modulo: '4-3-3',
    rosa: {},        // { slotId: { id, nome, ruolo, quotazione } }
    slotAttivo: null,
    ruoloAttivo: null
};

// Definizione moduli: quanti giocatori per ruolo
const MODULI = {
    '4-3-3': { P: 1, D: 4, C: 3, A: 3 },
    '4-4-2': { P: 1, D: 4, C: 4, A: 2 },
    '3-5-2': { P: 1, D: 3, C: 5, A: 2 },
    '3-4-3': { P: 1, D: 3, C: 4, A: 3 },
    '5-3-2': { P: 1, D: 5, C: 3, A: 2 }
};

// ============================================================
// AUTH
// ============================================================

async function registrazione() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const { error } = await _supabase.auth.signUp({ email, password });

    if (error) alert("Errore: " + error.message);
    else alert("Registrazione effettuata! Controlla la mail per confermare.");
}

async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const { error } = await _supabase.auth.signInWithPassword({ email, password });

    if (error) alert("Errore: " + error.message);
    else location.reload();
}

async function logout() {
    await _supabase.auth.signOut();
    location.reload();
}

async function controllaUtente() {
    const { data: { session } } = await _supabase.auth.getSession();

    if (session) {
        statoGioco.utente = session.user;
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('user-logged').style.display = 'block';
        document.getElementById('user-email').innerText = session.user.email;
        await caricaRosaSalvata();
    }
}

controllaUtente();
// ============================================================
// CAMPO E MODULO
// ============================================================

function cambiaModulo(nuovoModulo) {
    // Controlla se ci sono giocatrici già piazzate
    if (Object.keys(statoGioco.rosa).length > 0) {
        const conferma = confirm(
            "Cambiare modulo resetterà la tua rosa. Sei sicura?"
        );
        if (!conferma) {
            document.getElementById('select-modulo').value = statoGioco.modulo;
            return;
        }
    }

    statoGioco.modulo = nuovoModulo;
    statoGioco.rosa = {};
    statoGioco.budget = 500;
    aggiornaBudget();
    renderCampo();
}

function renderCampo() {
    const campo = document.getElementById('campo');
    campo.innerHTML = '';

    const modulo = MODULI[statoGioco.modulo];
    const righe = [
        { ruolo: 'A', label: 'Attacco' },
        { ruolo: 'C', label: 'Centrocampo' },
        { ruolo: 'D', label: 'Difesa' },
        { ruolo: 'P', label: 'Portiere' }
    ];

    righe.forEach(({ ruolo, label }) => {
        const numSlot = modulo[ruolo];
        const riga = document.createElement('div');
        riga.className = 'field-row';

        for (let i = 1; i <= numSlot; i++) {
            const slotId = `${ruolo.toLowerCase()}-${i}`;
            const giocatrice = statoGioco.rosa[slotId];

            const slot = document.createElement('div');
            slot.className = 'slot' + (giocatrice ? ' filled' : '');
            slot.id = slotId;

            if (giocatrice) {
                const cognome = giocatrice.nome.split(' ').pop();
                slot.innerHTML = `
                    <span class="slot-nome">${cognome}</span>
                    <span class="slot-quota">${giocatrice.quotazione}💰</span>
                    <button class="btn-rimuovi" onclick="rimuoviGiocatrice('${slotId}', event)">✕</button>
                `;
            } else {
                slot.innerHTML = '+';
                slot.onclick = () => apriMercato(ruolo, slotId);
            }

            riga.appendChild(slot);
        }

        campo.appendChild(riga);
    });

    // Panchina separata
    renderPanchina();
}

function renderPanchina() {
    const panchina = document.getElementById('panchina');
    panchina.innerHTML = '<h3>Panchina</h3>';

    const wrapper = document.createElement('div');
    wrapper.className = 'field-row';

    for (let i = 1; i <= 5; i++) {
        const slotId = `panchina-${i}`;
        const giocatrice = statoGioco.rosa[slotId];

        const slot = document.createElement('div');
        slot.className = 'slot' + (giocatrice ? ' filled' : '');
        slot.id = slotId;

        if (giocatrice) {
            const cognome = giocatrice.nome.split(' ').pop();
            slot.innerHTML = `
                <span class="slot-nome">${cognome}</span>
                <span class="slot-quota">${giocatrice.quotazione}💰</span>
                <button class="btn-rimuovi" onclick="rimuoviGiocatrice('${slotId}', event)">✕</button>
            `;
        } else {
            slot.innerHTML = '+';
            slot.onclick = () => apriMercato('tuttiruoli', slotId);
        }

        wrapper.appendChild(slot);
    }

    panchina.appendChild(wrapper);
}

function rimuoviGiocatrice(slotId, event) {
    event.stopPropagation();
    const giocatrice = statoGioco.rosa[slotId];
    if (!giocatrice) return;

    statoGioco.budget += giocatrice.quotazione;
    delete statoGioco.rosa[slotId];
    aggiornaBudget();
    renderCampo();
    salvaSuSupabase();
}

function aggiornaBudget() {
    document.getElementById('display-budget').innerText = 
        `Budget: ${statoGioco.budget} 💰`;
}
// ============================================================
// MERCATO E ACQUISTO
// ============================================================

async function apriMercato(ruolo, slotId) {
    statoGioco.slotAttivo = slotId;
    statoGioco.ruoloAttivo = ruolo;

    const contenitore = document.getElementById('lista-calciatrici');
    contenitore.innerHTML = '<p class="loading">Caricamento...</p>';

    // Scroll automatico al mercato
    document.getElementById('mercato-section').scrollIntoView({ 
        behavior: 'smooth' 
    });

    let query = _supabase
        .from('calciatrici')
        .select('*')
        .order('quotazione', { ascending: false });

    // Per la panchina mostra tutti i ruoli
    if (ruolo !== 'tuttiruoli') {
        query = query.eq('ruolo', ruolo);
    }

    const { data, error } = await query;

    if (error) {
        contenitore.innerHTML = '<p>Errore nel caricamento.</p>';
        return;
    }

    mostraCalciatrici(data);
}

function mostraCalciatrici(calciatrici) {
    const contenitore = document.getElementById('lista-calciatrici');
    const ruoloLabel = statoGioco.ruoloAttivo === 'tuttiruoli' 
        ? 'Panchina' 
        : statoGioco.ruoloAttivo;

    contenitore.innerHTML = `
        <div class="mercato-header">
            <h3>Mercato — ${ruoloLabel}</h3>
            <input 
                type="text" 
                id="cerca-giocatrice" 
                placeholder="Cerca per nome o squadra..." 
                oninput="filtraCalciatrici()"
            >
        </div>
        <div id="lista-cards"></div>
    `;

    renderCards(calciatrici);
    // Salviamo i dati completi per il filtro
    contenitore.dataset.calciatrici = JSON.stringify(calciatrici);
}

function filtraCalciatrici() {
    const termine = document.getElementById('cerca-giocatrice').value.toLowerCase();
    const tutte = JSON.parse(
        document.getElementById('lista-calciatrici').dataset.calciatrici
    );
    const filtrate = tutte.filter(g =>
        g.nome.toLowerCase().includes(termine) ||
        g.squadra.toLowerCase().includes(termine)
    );
    renderCards(filtrate);
}

function renderCards(calciatrici) {
    const lista = document.getElementById('lista-cards');

    if (calciatrici.length === 0) {
        lista.innerHTML = '<p>Nessuna giocatrice trovata.</p>';
        return;
    }

    // Giocatrici già in rosa (non acquistabili)
    const idsInRosa = Object.values(statoGioco.rosa).map(g => g.id);

    lista.innerHTML = calciatrici.map(g => {
        const giàInRosa = idsInRosa.includes(g.id);
        const nonSiPuòAcquistare = giàInRosa || g.quotazione > statoGioco.budget;

        return `
            <div class="card-mercato ${nonSiPuòAcquistare ? 'non-disponibile' : ''}">
                <div class="card-info">
                    <strong>${g.nome}</strong>
                    <span class="card-squadra">${g.squadra}</span>
                    <span class="card-ruolo">${g.ruolo}</span>
                </div>
                <div class="card-destra">
                    <span class="card-quota">${g.quotazione} 💰</span>
                    <button 
                        onclick="acquista('${g.id}', '${g.nome}', '${g.ruolo}', ${g.quotazione})"
                        ${nonSiPuòAcquistare ? 'disabled' : ''}
                    >
                        ${giàInRosa ? 'Già in rosa' : 'Acquista'}
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

async function acquista(id, nome, ruolo, quotazione) {
    if (quotazione > statoGioco.budget) {
        alert("Budget insufficiente!");
        return;
    }

    statoGioco.budget -= quotazione;
    statoGioco.rosa[statoGioco.slotAttivo] = { id, nome, ruolo, quotazione };

    aggiornaBudget();
    renderCampo();
    document.getElementById('lista-calciatrici').innerHTML = 
        '<p class="hint">Clicca su un ruolo nel campo per cercare le giocatrici</p>';

    await salvaSuSupabase();
}
// ============================================================
// SALVATAGGIO E CARICAMENTO
// ============================================================

async function salvaSuSupabase() {
    if (!statoGioco.utente) return;

    const utente_id = statoGioco.utente.id;

    // Prima eliminiamo la rosa esistente dell'utente
    await _supabase
        .from('rose')
        .delete()
        .eq('utente_id', utente_id);

    // Poi salviamo la rosa attuale slot per slot
    const righe = Object.entries(statoGioco.rosa).map(([slotId, g]) => ({
        utente_id,
        calciatrice_id: g.id,
        posizione_campo: slotId,
        is_titolare: !slotId.startsWith('panchina'),
        modulo: statoGioco.modulo
    }));

    if (righe.length === 0) return;

    const { error } = await _supabase
        .from('rose')
        .insert(righe);

    if (error) console.error("Errore salvataggio rosa:", error);
}

async function caricaRosaSalvata() {
    if (!statoGioco.utente) return;

    const { data, error } = await _supabase
        .from('rose')
        .select(`
            posizione_campo,
            is_titolare,
            modulo,
            calciatrici (
                id,
                nome,
                ruolo,
                quotazione,
                squadra
            )
        `)
        .eq('utente_id', statoGioco.utente.id);

    if (error || !data || data.length === 0) {
        renderCampo();
        return;
    }

    // Ripristina il modulo
    statoGioco.modulo = data[0].modulo || '4-3-3';
    document.getElementById('select-modulo').value = statoGioco.modulo;

    // Ripristina la rosa e ricalcola il budget
    let speso = 0;
    data.forEach(riga => {
        const g = riga.calciatrici;
        statoGioco.rosa[riga.posizione_campo] = {
            id: g.id,
            nome: g.nome,
            ruolo: g.ruolo,
            quotazione: g.quotazione,
            squadra: g.squadra
        };
        speso += g.quotazione;
    });

    statoGioco.budget = 500 - speso;
    aggiornaBudget();
    renderCampo();
}
