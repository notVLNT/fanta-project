// ============================================================
// CONFIGURAZIONE
// ============================================================

const SUPABASE_URL = 'https://ejnbetqywcyukrtwetjt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_P-sn36PRhmvlUVlQrpXBCw_ThF-dgWZ';
const ADMIN_ID = '95c5d398-fa50-4bdb-9568-facfc2b0bb90';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Sistema di punteggio
const PUNTI = {
    gol_A:       8,
    gol_C:       10,
    gol_D:       13,
    gol_P:       13,
    assist:      5,
    clean_sheet: 6,
    ammonizione: -1,
    espulsione:  -3,
    rigore_parato: 8
};

// ============================================================
// AUTH ADMIN
// ============================================================

async function loginAdmin() {
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;

    const { data, error } = await _supabase.auth.signInWithPassword({ 
        email, password 
    });

    if (error) {
        document.getElementById('login-error').innerText = error.message;
        return;
    }

    // Controlla che sia admin
    if (data.user.id !== ADMIN_ID) {
        await _supabase.auth.signOut();
        document.getElementById('login-error').innerText = 
            "Non sei autorizzata ad accedere a questa pagina.";
        return;
    }

    mostraPannello();
}

async function logoutAdmin() {
    await _supabase.auth.signOut();
    location.reload();
}

async function controllaSessioneAdmin() {
    const { data: { session } } = await _supabase.auth.getSession();
    if (session && session.user.id === ADMIN_ID) mostraPannello();
}

function mostraPannello() {
    document.getElementById('login-admin').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'block';
    caricaTutto();
}

// ============================================================
// TABS
// ============================================================

function mostraTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => 
        t.classList.remove('active')
    );
    document.querySelectorAll('.tab').forEach(t => 
        t.classList.remove('active')
    );
    document.getElementById(tabId).classList.add('active');
    event.target.classList.add('active');
}

// ============================================================
// CARICAMENTO INIZIALE
// ============================================================

async function caricaTutto() {
    await Promise.all([
        caricaCalciatrici(),
        caricaGiornate(),
        caricaClassifica()
    ]);
}

// ============================================================
// CALCIATRICI
// ============================================================

async function caricaCalciatrici() {
    const { data } = await _supabase
        .from('calciatrici')
        .select('*')
        .order('ruolo')
        .order('quotazione', { ascending: false });

    const tbody = document.getElementById('tabella-calciatrici');
    tbody.innerHTML = data.map(g => `
        <tr>
            <td>${g.nome}</td>
            <td>${g.squadra}</td>
            <td><strong>${g.ruolo}</strong></td>
            <td>${g.quotazione} 💰</td>
            <td>
                <button class="btn-danger" 
                    onclick="eliminaCalciatrice('${g.id}')">
                    Elimina
                </button>
            </td>
        </tr>
    `).join('');

    // Popola select voti
    const select = document.getElementById('v-calciatrice');
    select.innerHTML = data.map(g => 
        `<option value="${g.id}" data-ruolo="${g.ruolo}">
            ${g.nome} (${g.ruolo} - ${g.squadra})
        </option>`
    ).join('');
}

async function aggiungiCalciatrice() {
    const nome = document.getElementById('c-nome').value.trim();
    const squadra = document.getElementById('c-squadra').value.trim();
    const ruolo = document.getElementById('c-ruolo').value;
    const quotazione = parseInt(document.getElementById('c-quotazione').value);

    if (!nome || !squadra || !quotazione) {
        mostrafeedback('feedback-calciatrice', 'Compila tutti i campi!', 'error');
        return;
    }

    const { error } = await _supabase
        .from('calciatrici')
        .insert({ nome, squadra, ruolo, quotazione });

    if (error) {
        mostrafeedback('feedback-calciatrice', 'Errore: ' + error.message, 'error');
        return;
    }

    mostrafeedback('feedback-calciatrice', `${nome} aggiunta!`, 'success');
    document.getElementById('c-nome').value = '';
    document.getElementById('c-squadra').value = '';
    document.getElementById('c-quotazione').value = '';
    await caricaCalciatrici();
}

async function eliminaCalciatrice(id) {
    if (!confirm("Sei sicura di voler eliminare questa calciatrice?")) return;

    const { error } = await _supabase
        .from('calciatrici')
        .delete()
        .eq('id', id);

    if (!error) await caricaCalciatrici();
}

// ============================================================
// GIORNATE
// ============================================================

async function caricaGiornate() {
    const { data } = await _supabase
        .from('giornate')
        .select('*')
        .order('numero');

    const tbody = document.getElementById('tabella-giornate');
    tbody.innerHTML = data.map(g => `
        <tr>
            <td><strong>Giornata ${g.numero}</strong></td>
            <td>${g.stagione}</td>
            <td>${g.data_inizio || '—'} → ${g.data_fine || '—'}</td>
            <td>
                <span class="${g.is_attiva ? 'giornata-attiva' : 'giornata-inattiva'}">
                    ${g.is_attiva ? '✅ Attiva' : 'Inattiva'}
                </span>
            </td>
            <td>
                ${!g.is_attiva ? `
                    <button class="btn-primary" style="font-size:12px; padding:4px 10px;"
                        onclick="attivaGiornata('${g.id}')">
                        Attiva
                    </button>` : ''}
            </td>
        </tr>
    `).join('');

    // Popola tutti i select giornate
    const options = data.map(g => 
        `<option value="${g.id}">Giornata ${g.numero} (${g.stagione})</option>`
    ).join('');

    document.getElementById('v-giornata').innerHTML = options;
    document.getElementById('filtro-giornata-voti').innerHTML = options;
    document.getElementById('calc-giornata').innerHTML = options;

    if (data.length > 0) await caricaVotiInseriti();
}

async function creaGiornata() {
    const numero = parseInt(document.getElementById('g-numero').value);
    const stagione = document.getElementById('g-stagione').value.trim();
    const data_inizio = document.getElementById('g-inizio').value || null;
    const data_fine = document.getElementById('g-fine').value || null;

    if (!numero || !stagione) {
        mostrafeedback('feedback-giornata', 'Inserisci numero e stagione!', 'error');
        return;
    }

    const { error } = await _supabase
        .from('giornate')
        .insert({ numero, stagione, data_inizio, data_fine });

    if (error) {
        mostrafeedback('feedback-giornata', 'Errore: ' + error.message, 'error');
        return;
    }

    mostrafeedback('feedback-giornata', `Giornata ${numero} creata!`, 'success');
    document.getElementById('g-numero').value = '';
    await caricaGiornate();
}

async function attivaGiornata(id) {
    // Prima disattiva tutte
    await _supabase
        .from('giornate')
        .update({ is_attiva: false })
        .neq('id', id);

    // Poi attiva quella selezionata
    await _supabase
        .from('giornate')
        .update({ is_attiva: true })
        .eq('id', id);

    await caricaGiornate();
}

// ============================================================
// VOTI
// ============================================================

async function inserisciVoti() {
    const calciatrice_id = document.getElementById('v-calciatrice').value;
    const giornata_id = document.getElementById('v-giornata').value;
    const voto_base = parseFloat(document.getElementById('v-voto').value);
    const gol = parseInt(document.getElementById('v-gol').value) || 0;
    const assist = parseInt(document.getElementById('v-assist').value) || 0;
    const rigore_parato = parseInt(document.getElementById('v-rigori').value) || 0;
    const ammonizione = document.getElementById('v-ammonizione').value === 'true';
    const espulsione = document.getElementById('v-espulsione').value === 'true';
    const clean_sheet = document.getElementById('v-cleansheet').value === 'true';

    const { error } = await _supabase
        .from('voti')
        .upsert({
            calciatrice_id,
            giornata_id,
            voto_base,
            gol,
            assist,
            rigore_parato,
            ammonizione,
            espulsione,
            clean_sheet
        }, { onConflict: 'calciatrice_id,giornata_id' });

    if (error) {
        mostrafeedback('feedback-voti', 'Errore: ' + error.message, 'error');
        return;
    }

    mostrafeedback('feedback-voti', 'Voti salvati!', 'success');
    
    // Reset form
    document.getElementById('v-voto').value = '6';
    document.getElementById('v-gol').value = '0';
    document.getElementById('v-assist').value = '0';
    document.getElementById('v-rigori').value = '0';
    document.getElementById('v-ammonizione').value = 'false';
    document.getElementById('v-espulsione').value = 'false';
    document.getElementById('v-cleansheet').value = 'false';

    await caricaVotiInseriti();
}

async function caricaVotiInseriti() {
    const giornata_id = document.getElementById('filtro-giornata-voti').value;
    if (!giornata_id) return;

    const { data } = await _supabase
        .from('voti')
        .select(`
            *,
            calciatrici (nome, ruolo)
        `)
        .eq('giornata_id', giornata_id)
        .order('inserito_il', { ascending: false });

    const tbody = document.getElementById('tabella-voti');

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#999;">Nessun voto inserito</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(v => `
        <tr>
            <td>
                <strong>${v.calciatrici.nome}</strong>
                <span style="color:#999; font-size:11px;"> ${v.calciatrici.ruolo}</span>
            </td>
            <td>${v.voto_base}</td>
            <td>${v.gol}</td>
            <td>${v.assist}</td>
            <td>${v.clean_sheet ? '✅' : '—'}</td>
            <td>${v.ammonizione ? '🟨' : '—'}</td>
            <td>${v.espulsione ? '🟥' : '—'}</td>
            <td>
                <button class="btn-danger" 
                    onclick="eliminaVoto('${v.id}')">
                    Elimina
                </button>
            </td>
        </tr>
    `).join('');
}

async function eliminaVoto(id) {
    if (!confirm("Eliminare questo voto?")) return;
    await _supabase.from('voti').delete().eq('id', id);
    await caricaVotiInseriti();
}

// ============================================================
// CALCOLO PUNTEGGI
// ============================================================

async function calcolaPunteggi() {
    const giornata_id = document.getElementById('calc-giornata').value;

    mostrafeedback('feedback-punteggi', 'Calcolo in corso...', 'success');

    // 1. Carica tutti i voti della giornata
    const { data: voti } = await _supabase
        .from('voti')
        .select(`*, calciatrici (ruolo)`)
        .eq('giornata_id', giornata_id);

    // 2. Carica tutte le rose (titolari)
    const { data: rose } = await _supabase
        .from('rose')
        .select('*')
        .eq('is_titolare', true);

    if (!voti || !rose) {
        mostrafeedback('feedback-punteggi', 'Errore nel caricamento dati.', 'error');
        return;
    }

    // 3. Crea mappa voti per calciatrice
    const mappaVoti = {};
    voti.forEach(v => {
        mappaVoti[v.calciatrice_id] = v;
    });

    // 4. Calcola punteggio per ogni utente
    const punteggiUtenti = {};
    rose.forEach(slot => {
        const voto = mappaVoti[slot.calciatrice_id];
        if (!voto) return;

        const punti = calcolaPuntiCalciatrice(voto);

        if (!punteggiUtenti[slot.utente_id]) {
            punteggiUtenti[slot.utente_id] = 0;
        }
        punteggiUtenti[slot.utente_id] += punti;
    });

    // 5. Salva i punteggi su Supabase
    const righe = Object.entries(punteggiUtenti).map(([utente_id, punti]) => ({
        utente_id,
        giornata_id,
        punti_giornata: Math.round(punti * 100) / 100
    }));

    if (righe.length === 0) {
        mostrafeedback('feedback-punteggi', 
            'Nessun punteggio da calcolare. Hai inserito i voti?', 'error');
        return;
    }

    // Upsert: aggiorna se già esistente
    const { error } = await _supabase
        .from('punteggi')
        .upsert(righe, { onConflict: 'utente_id,giornata_id' });

    if (error) {
        mostrafeedback('feedback-punteggi', 'Errore: ' + error.message, 'error');
        return;
    }

    // 6. Aggiorna punti totali
    await aggiornaPuntiTotali();

    mostrafeedback('feedback-punteggi', 
        `Punteggi calcolati per ${righe.length} utenti!`, 'success');
    
    await caricaClassifica();
}

function calcolaPuntiCalciatrice(voto) {
    const ruolo = voto.calciatrici.ruolo;
    let punti = 0;

    // Voto base: scala da -2 (voto 4) a +3 (voto 8+)
    if (voto.voto_base >= 8)       punti += 3;
    else if (voto.voto_base >= 7)  punti += 2;
    else if (voto.voto_base >= 6)  punti += 1;
    else if (voto.voto_base >= 5)  punti += 0;
    else if (voto.voto_base >= 4)  punti -= 1;
    else                           punti -= 2;

    // Gol
    const chiaveGol = `gol_${ruolo}`;
    punti += voto.gol * (PUNTI[chiaveGol] || PUNTI.gol_A);

    // Assist
    punti += voto.assist * PUNTI.assist;

    // Clean sheet (solo P e D)
    if (voto.clean_sheet && (ruolo === 'P' || ruolo === 'D')) {
        punti += PUNTI.clean_sheet;
    }

    // Rigori parati
    punti += voto.rigore_parato * PUNTI.rigore_parato;

    // Cartellini
    if (voto.ammonizione) punti += PUNTI.ammonizione;
    if (voto.espulsione)  punti += PUNTI.espulsione;

    return punti;
}

async function aggiornaPuntiTotali() {
    // Somma tutti i punti giornata per ogni utente e aggiorna punti_totali
    const { data } = await _supabase
        .from('punteggi')
        .select('utente_id, punti_giornata');

    if (!data) return;

    const totali = {};
    data.forEach(r => {
        if (!totali[r.utente_id]) totali[r.utente_id] = 0;
        totali[r.utente_id] += r.punti_giornata;
    });

    // Aggiorna ogni riga con il nuovo totale
    await Promise.all(
        Object.entries(totali).map(([utente_id, totale]) =>
            _supabase
                .from('punteggi')
                .update({ punti_totali: Math.round(totale * 100) / 100 })
                .eq('utente_id', utente_id)
        )
    );
}

// ============================================================
// CLASSIFICA
// ============================================================

async function caricaClassifica() {
    const { data } = await _supabase
        .from('punteggi')
        .select('utente_id, punti_totali')
        .order('punti_totali', { ascending: false });

    if (!data || data.length === 0) {
        document.getElementById('tabella-classifica').innerHTML = 
            '<tr><td colspan="3" style="text-align:center; color:#999;">Nessun punteggio ancora</td></tr>';
        return;
    }

    // Carica le email degli utenti
    const { data: utenti } = await _supabase
        .from('admins')
        .select('utente_id');

    const tbody = document.getElementById('tabella-classifica');
    tbody.innerHTML = data.map((r, i) => `
        <tr>
            <td><strong>#${i + 1}</strong></td>
            <td>${r.utente_id}</td>
            <td><strong>${r.punti_totali} pt</strong></td>
        </tr>
    `).join('');
}

// ============================================================
// UTILITY
// ============================================================

function mostrafeedback(id, messaggio, tipo) {
    const el = document.getElementById(id);
    el.className = `feedback ${tipo}`;
    el.innerText = messaggio;
    setTimeout(() => { el.className = 'feedback'; }, 4000);
}

// Avvia
controllaSessioneAdmin();
