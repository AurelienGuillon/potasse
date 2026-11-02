'use strict';

/* =====================================================================
   POMODORO : toujours visible dans la barre du haut
   ===================================================================== */

const CLE_POMO = 'potasse:pomodoro';
const CLE_POMO_DUREES = 'potasse:pomodoro-durees';
const POMO_NOMS = { focus: 'Focus', pause: 'Pause', longue: 'Grande pause' };
const POMO_SESSIONS_AVANT_LONGUE = 4;
const ICONE_LECTURE = '<path d="M4 2.5v11l9-5.5z" fill="currentColor"/>';
const ICONE_PAUSE = '<path d="M3.5 2.5h3v11h-3zM9.5 2.5h3v11h-3z" fill="currentColor"/>';

let pomoDurees = { focus: 25, pause: 5, longue: 15 };
// fin : horodatage de fin quand le minuteur tourne, sinon null. restant : ms restantes à l'arrêt.
let pomo = { mode: 'focus', fin: null, restant: 25 * 60000, cycles: 0 };
let pomoTic = null;
let audio = null;

const dureePomo = (mode) => pomoDurees[mode] * 60000;
const restantPomo = () => (pomo.fin ? Math.max(0, pomo.fin - Date.now()) : pomo.restant);

function chargerPomo() {
  const d = lireJson(CLE_POMO_DUREES, null);
  if (d && d.focus && d.pause && d.longue) pomoDurees = d;
  const p = lireJson(CLE_POMO, null);
  if (p && POMO_NOMS[p.mode]) pomo = p;
  else pomo = { mode: 'focus', fin: null, restant: dureePomo('focus'), cycles: 0 };
  // Le minuteur a fini pendant que la page était fermée : on passe à l'étape suivante, sans sonner.
  if (pomo.fin && pomo.fin <= Date.now()) etapeSuivante(false);
  if (pomo.fin) demarrerTic();
  afficherPomo();
}

function sauverPomo() {
  try { ecrireJson(CLE_POMO, pomo); } catch (e) { /* reste en mémoire */ }
}

const fmtMinutes = (ms) => {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

function afficherPomo() {
  const reste = restantPomo();
  const total = dureePomo(pomo.mode);
  const enCours = Boolean(pomo.fin);
  const bloc = $('#pomodoro');
  bloc.dataset.mode = pomo.mode;
  bloc.classList.toggle('en-cours', enCours);
  $('#pomo-mode').textContent = POMO_NOMS[pomo.mode];
  $('#pomo-temps').textContent = fmtMinutes(reste);
  $('#pomo-barre').style.width = `${Math.min(100, ((total - reste) / total) * 100)}%`;
  const faits = pomo.cycles % POMO_SESSIONS_AVANT_LONGUE;
  $$('#pomo-cycles i').forEach((p, i) => p.classList.toggle('plein', i < faits));
  $('#pomo-cycles').setAttribute('aria-label', `${faits} ${pluriel(faits, 'session', 'sessions')} de focus sur ${POMO_SESSIONS_AVANT_LONGUE}`);
  $('#pomo-icone').innerHTML = enCours ? ICONE_PAUSE : ICONE_LECTURE;
  $('#pomo-lancer').setAttribute('aria-label', enCours ? 'Mettre le minuteur en pause' : 'Lancer le minuteur');
  document.title = enCours ? `${fmtMinutes(reste)} · ${POMO_NOMS[pomo.mode]} · Potasse` : 'Potasse';
}

function demarrerTic() {
  clearInterval(pomoTic);
  pomoTic = setInterval(() => {
    if (pomo.fin && pomo.fin <= Date.now()) {
      etapeSuivante(true);
      return;
    }
    afficherPomo();
  }, 250);
}

function etapeSuivante(sonner) {
  if (pomo.mode === 'focus') {
    pomo.cycles++;
    pomo.mode = pomo.cycles % POMO_SESSIONS_AVANT_LONGUE === 0 ? 'longue' : 'pause';
  } else {
    pomo.mode = 'focus';
  }
  // L'étape suivante attend qu'on la lance : pas de pause qui démarre pendant qu'on est parti.
  pomo.fin = null;
  pomo.restant = dureePomo(pomo.mode);
  clearInterval(pomoTic);
  sauverPomo();
  afficherPomo();
  if (sonner) {
    sonnerie();
    const bloc = $('#pomodoro');
    bloc.classList.remove('sonne');
    void bloc.offsetWidth;
    bloc.classList.add('sonne');
  }
}

function sonnerie() {
  if (!audio) return;
  const t0 = audio.currentTime;
  [0, 0.28, 0.56].forEach((d) => {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'square';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, t0 + d);
    gain.gain.exponentialRampToValueAtTime(0.12, t0 + d + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.2);
    osc.connect(gain).connect(audio.destination);
    osc.start(t0 + d);
    osc.stop(t0 + d + 0.22);
  });
}

$('#pomo-lancer').addEventListener('click', () => {
  // Le son ne peut être préparé qu'après un geste de l'utilisateur.
  if (!audio && (window.AudioContext || window.webkitAudioContext)) {
    try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audio = null; }
  }
  if (audio && audio.state === 'suspended') audio.resume();
  if (pomo.fin) {
    pomo.restant = restantPomo();
    pomo.fin = null;
    clearInterval(pomoTic);
  } else {
    pomo.fin = Date.now() + pomo.restant;
    demarrerTic();
  }
  sauverPomo();
  afficherPomo();
});

$('#pomo-reinit').addEventListener('click', () => {
  pomo.fin = null;
  pomo.restant = dureePomo(pomo.mode);
  clearInterval(pomoTic);
  sauverPomo();
  afficherPomo();
});

$('#pomo-passer').addEventListener('click', () => etapeSuivante(false));

/* =====================================================================
   ÉVALS + CALENDRIER
   ===================================================================== */

const CLE_EVALS = 'potasse:evals';
const CLE_TACHES = 'potasse:taches';
const JOURS_COURTS = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];
const SEUIL_URGENCE = 3;   // jours

let evals = [];    // { id, titre, date: 'AAAA-MM-JJ' }
let taches = [];   // { id, texte, priorite, evalId, faite, creeLe }
let moisAffiche = null;   // premier jour du mois affiché
let jourChoisi = null;    // 'AAAA-MM-JJ'

function chargerAgenda() {
  const e = lireJson(CLE_EVALS, []);
  const t = lireJson(CLE_TACHES, []);
  evals = Array.isArray(e) ? e : [];
  taches = Array.isArray(t) ? t : [];
}

function sauverAgenda(zoneErreur) {
  try {
    ecrireJson(CLE_EVALS, evals);
    ecrireJson(CLE_TACHES, taches);
  } catch (e) {
    if (zoneErreur) message(zoneErreur, esc(messageStockage(e)));
  }
}

const dateLocale = (iso) => { const [a, m, j] = iso.split('-').map(Number); return new Date(a, m - 1, j); };
const joursAvant = (iso) => Math.round((dateLocale(iso) - dateLocale(jourLocal())) / 86400000);
const texteJours = (n) => (n === 0 ? "aujourd'hui" : n === 1 ? 'demain' : `J-${n}`);
const evalsAVenir = () => evals.filter((e) => joursAvant(e.date) >= 0).sort((a, b) => (a.date < b.date ? -1 : 1));
const trouverEval = (id) => evals.find((e) => e.id === id);

function rendreCalendrier() {
  if (!moisAffiche) { const d = new Date(); moisAffiche = new Date(d.getFullYear(), d.getMonth(), 1); }
  $('#cal-mois').textContent = moisAffiche.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const decalage = (moisAffiche.getDay() + 6) % 7;   // lundi en premier
  const debut = new Date(moisAffiche.getFullYear(), moisAffiche.getMonth(), 1 - decalage);
  const aujourdhui = jourLocal();
  const parJour = {};
  evals.forEach((e) => { (parJour[e.date] = parJour[e.date] || []).push(e); });
  let html = JOURS_COURTS.map((j) => `<span class="cal-jsem" aria-hidden="true">${j}</span>`).join('');
  for (let i = 0; i < 42; i++) {
    const d = new Date(debut.getFullYear(), debut.getMonth(), debut.getDate() + i);
    const iso = jourLocal(d);
    const lesEvals = parJour[iso] || [];
    const classes = ['cal-jour'];
    if (d.getMonth() !== moisAffiche.getMonth()) classes.push('hors-mois');
    if (iso === aujourdhui) classes.push('aujourdhui');
    if (lesEvals.length) classes.push('a-eval');
    if (iso === jourChoisi) classes.push('choisi');
    const libelle = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
      + (lesEvals.length ? ` : ${lesEvals.map((e) => e.titre).join(', ')}` : '');
    html += `<button type="button" class="${classes.join(' ')}" data-jour="${iso}" aria-label="${esc(libelle)}"${iso === jourChoisi ? ' aria-pressed="true"' : ''}>${d.getDate()}</button>`;
  }
  $('#cal-grille').innerHTML = html;
}

$('#cal-prec').addEventListener('click', () => { moisAffiche = new Date(moisAffiche.getFullYear(), moisAffiche.getMonth() - 1, 1); rendreCalendrier(); });
$('#cal-suiv').addEventListener('click', () => { moisAffiche = new Date(moisAffiche.getFullYear(), moisAffiche.getMonth() + 1, 1); rendreCalendrier(); });

// Cliquer sur un jour : on surligne ses évals, ou on prépare l'ajout d'une éval ce jour-là.
$('#cal-grille').addEventListener('click', (e) => {
  const b = e.target.closest('[data-jour]');
  if (!b) return;
  jourChoisi = jourChoisi === b.dataset.jour ? null : b.dataset.jour;
  if (jourChoisi && !evals.some((x) => x.date === jourChoisi)) {
    $('#eval-date').value = jourChoisi;
    $('#ajout-eval').open = true;
  }
  rendreCalendrier();
  rendreEvals();
  const focus = $(`#cal-grille [data-jour="${b.dataset.jour}"]`);
  if (focus) focus.focus();
});

function rendreEvals() {
  const liste = evalsAVenir();
  $('#liste-evals').innerHTML = liste.length ? liste.slice(0, 6).map((e) => {
    const n = joursAvant(e.date);
    const d = dateLocale(e.date);
    const nbTaches = taches.filter((t) => t.evalId === e.id && !t.faite).length;
    return `<li class="eval${e.date === jourChoisi ? ' surlignee' : ''}">
      <span class="eval-date" aria-hidden="true"><b>${d.getDate()}</b><small>${esc(d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''))}</small></span>
      <span><span class="eval-titre">${esc(e.titre)}</span><br><span class="eval-meta">${esc(d.toLocaleDateString('fr-FR', { weekday: 'short' }))} · ${nbTaches} ${pluriel(nbTaches, 'tâche', 'tâches')}</span></span>
      <span class="eval-droite">
        <span class="compte-a-rebours${n <= SEUIL_URGENCE ? ' urgent' : ''}">${texteJours(n)}</span>
        <button class="icone-suppr" type="button" data-suppr-eval="${esc(e.id)}" aria-label="Supprimer l'éval ${esc(e.titre)}">×</button>
      </span>
    </li>`;
  }).join('') : '<li class="vide-mini">Aucune éval à venir. Ajoute la prochaine pour que tes tâches s\'organisent autour.</li>';

  // Le menu des tâches ne propose que les évals à venir.
  const select = $('#tache-eval');
  const garde = select.value;
  select.innerHTML = '<option value="">Aucune</option>' + liste.map((e) => `<option value="${esc(e.id)}">${esc(e.titre)} (${texteJours(joursAvant(e.date))})</option>`).join('');
  if (liste.some((e) => e.id === garde)) select.value = garde;
}

$('#form-eval').addEventListener('submit', (e) => {
  e.preventDefault();
  const zone = $('#eval-message');
  const titre = $('#eval-titre').value.trim();
  const date = $('#eval-date').value;
  if (!titre) { message(zone, 'Donne un nom à ton éval.'); $('#eval-titre').focus(); return; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { message(zone, 'Choisis une date.'); $('#eval-date').focus(); return; }
  zone.innerHTML = '';
  evals.push({ id: nouvelId(), titre, date });
  sauverAgenda(zone);
  $('#eval-titre').value = '';
  jourChoisi = date;
  moisAffiche = new Date(dateLocale(date).getFullYear(), dateLocale(date).getMonth(), 1);
  rendreAgenda();
});

$('#liste-evals').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-suppr-eval]');
  if (!b) return;
  const ev = trouverEval(b.dataset.supprEval);
  if (!ev || !(await confirmer(`Supprimer l'éval « ${ev.titre} » ? Ses tâches restent, sans lien.`, 'Supprimer'))) return;
  evals = evals.filter((x) => x.id !== ev.id);
  taches.forEach((t) => { if (t.evalId === ev.id) t.evalId = null; });
  sauverAgenda();
  rendreAgenda();
});

/* =====================================================================
   TO-DO PRIORISÉE
   ===================================================================== */

const RANG_PRIO = { haute: 0, moyenne: 1, basse: 2 };
const NOMS_PRIO = { haute: 'Haute', moyenne: 'Moyenne', basse: 'Basse' };
const ICONE_COCHE = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 8.5l3.5 3.5 7.5-8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="square"/></svg>';
let tacheTamponnee = null;   // id de la tâche qui vient d'être validée, pour jouer le tampon une fois

// Ordre : à faire d'abord ; puis une éval proche passe avant ; puis la priorité ; puis la plus ancienne.
function ordreTaches(a, b) {
  if (a.faite !== b.faite) return a.faite ? 1 : -1;
  const ea = a.evalId && trouverEval(a.evalId);
  const eb = b.evalId && trouverEval(b.evalId);
  const ua = ea && joursAvant(ea.date) >= 0 && joursAvant(ea.date) <= SEUIL_URGENCE;
  const ub = eb && joursAvant(eb.date) >= 0 && joursAvant(eb.date) <= SEUIL_URGENCE;
  if (ua !== ub) return ua ? -1 : 1;
  if (RANG_PRIO[a.priorite] !== RANG_PRIO[b.priorite]) return RANG_PRIO[a.priorite] - RANG_PRIO[b.priorite];
  const da = ea ? ea.date : '9999';
  const db = eb ? eb.date : '9999';
  if (da !== db) return da < db ? -1 : 1;
  return a.creeLe < b.creeLe ? -1 : 1;
}

function rendreTaches() {
  const liste = taches.slice().sort(ordreTaches);
  const restantes = taches.filter((t) => !t.faite).length;
  $('#todo-compte').textContent = taches.length ? `${restantes} en cours · ${taches.length - restantes} ${pluriel(taches.length - restantes, 'validée', 'validées')}` : '';
  $('#btn-ranger-taches').hidden = !taches.some((t) => t.faite);
  $('#liste-taches').innerHTML = liste.length ? liste.map((t) => {
    const ev = t.evalId && trouverEval(t.evalId);
    const n = ev ? joursAvant(ev.date) : null;
    const puceEval = ev
      ? `<span class="puce puce-eval${n !== null && n >= 0 && n <= SEUIL_URGENCE ? ' urgent' : ''}">${esc(ev.titre)} · ${n < 0 ? 'passée' : texteJours(n)}</span>`
      : '';
    return `<li class="tache prio-${t.priorite}${t.faite ? ' faite' : ''}${t.id === tacheTamponnee ? ' vient-de-valider' : ''}" data-id="${esc(t.id)}">
      <button class="tache-coche" type="button" data-cocher="${esc(t.id)}" aria-pressed="${t.faite}" aria-label="${t.faite ? 'Remettre à faire' : 'Valider'} : ${esc(t.texte)}">${ICONE_COCHE}</button>
      <div>
        <div class="tache-texte">${esc(t.texte)}</div>
        <div class="tache-meta"><span class="puce puce-${t.priorite}">${NOMS_PRIO[t.priorite]}</span>${puceEval}</div>
      </div>
      <button class="icone-suppr" type="button" data-suppr-tache="${esc(t.id)}" aria-label="Supprimer la tâche ${esc(t.texte)}">×</button>
      <span class="tampon" aria-hidden="true">VALIDÉ</span>
    </li>`;
  }).join('') : '<li class="vide-mini">Rien à faire pour l\'instant. Profites-en, ou ajoute la première tâche.</li>';
  tacheTamponnee = null;
}

$('#form-tache').addEventListener('submit', (e) => {
  e.preventDefault();
  const texte = $('#tache-texte').value.trim();
  if (!texte) { $('#tache-texte').focus(); return; }
  taches.push({ id: nouvelId(), texte, priorite: $('#tache-prio').value, evalId: $('#tache-eval').value || null, faite: false, creeLe: new Date().toISOString() });
  sauverAgenda();
  $('#tache-texte').value = '';
  $('#tache-texte').focus();
  rendreAgenda();
});

$('#liste-taches').addEventListener('click', (e) => {
  const coche = e.target.closest('[data-cocher]');
  const suppr = e.target.closest('[data-suppr-tache]');
  if (coche) {
    const t = taches.find((x) => x.id === coche.dataset.cocher);
    if (!t) return;
    t.faite = !t.faite;
    sauverAgenda();
    if (t.faite) {
      // On imprime le tampon sur place, puis la ligne descend avec les tâches validées.
      const li = coche.closest('.tache');
      li.classList.add('faite', 'vient-de-valider');
      coche.setAttribute('aria-pressed', 'true');
      setTimeout(() => { rendreAgenda(); focusTache(t.id); }, 900);
    } else {
      rendreAgenda();
      focusTache(t.id);
    }
  }
  if (suppr) {
    taches = taches.filter((x) => x.id !== suppr.dataset.supprTache);
    sauverAgenda();
    rendreAgenda();
  }
});

function focusTache(id) {
  const b = $(`#liste-taches [data-cocher="${CSS.escape(id)}"]`);
  if (b && document.activeElement === document.body) b.focus({ preventScroll: true });
}

$('#btn-ranger-taches').addEventListener('click', () => {
  taches = taches.filter((t) => !t.faite);
  sauverAgenda();
  rendreAgenda();
});

function rendreAgenda() {
  rendreCalendrier();
  rendreEvals();
  rendreTaches();
  rendreChapeau();
}

/* =====================================================================
   TABLEAU DE BORD
   ===================================================================== */

function rendreChapeau() {
  const prochaine = evalsAVenir()[0];
  const restantes = taches.filter((t) => !t.faite).length;
  const morceaux = [];
  if (prochaine) {
    const n = joursAvant(prochaine.date);
    morceaux.push(`Prochaine éval : <strong>${esc(prochaine.titre)}</strong>, ${n === 0 ? "c'est aujourd'hui" : n === 1 ? "c'est demain" : `dans ${n} jours`}.`);
  } else {
    morceaux.push('Aucune éval en vue. Note la prochaine dans l\'agenda.');
  }
  morceaux.push(restantes ? `${restantes} ${pluriel(restantes, 'tâche t\'attend', 'tâches t\'attendent')}.` : 'Ta to-do est vide.');
  $('#accueil-chapeau').innerHTML = morceaux.join(' ');
}

function rendreAccueil() {
  chargerAgenda();
  const d = new Date();
  $('#accueil-date').textContent = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  rendreAgenda();

  // Bloc fiches : les trois plus récentes.
  const recentes = fiches.slice(0, 3);
  $('#accueil-fiches').innerHTML = recentes.map((f) => `<li><button type="button" data-ouvrir-fiche="${esc(f.id)}">
    <span>${esc(f.titre)}</span><span class="discret">${esc(new Date(f.majLe).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }))}</span>
  </button></li>`).join('');

  // Bloc quiz : quelques chiffres sur l'entraînement.
  const notes = cours.flatMap((c) => notesHors(c));
  const passes = cours.reduce((s, c) => s + (c.historique || []).length, 0);
  const moyenne = notes.length ? Math.round((notes.reduce((s, x) => s + x, 0) / notes.length) * 10) / 10 : null;
  $('#accueil-quiz').innerHTML = `
    <div><dt>Cours</dt><dd>${cours.length}</dd></div>
    <div><dt>QCM passés</dt><dd>${passes}</dd></div>
    <div><dt>Moyenne</dt><dd>${moyenne === null ? '—' : fmtNote(moyenne)}</dd></div>`;
}
RENDUS.accueil = rendreAccueil;

/* =====================================================================
   RÉGLAGES : réserve d'énergie et durées du Pomodoro
   ===================================================================== */

function rendreReglagesTableau() {
  const f = $('#form-energie').elements;
  f.namedItem('reserve').value = reserve;
  majDetailEnergie();
  $('#pomo-focus').value = pomoDurees.focus;
  $('#pomo-pause').value = pomoDurees.pause;
  $('#pomo-longue').value = pomoDurees.longue;
  $('#pomo-message').innerHTML = '';
}

function majDetailEnergie() {
  const pct = pourcentEnergie();
  $('#energie-detail').textContent = `Aujourd'hui : ${pct} % de la réserve utilisée (${fmtNombre(energie.unites)} sur ${fmtNombre(RESERVES[reserve])} unités). Elle se recharge à minuit.`;
}

const rendreCleSeule = RENDUS.cle;
RENDUS.cle = () => { rendreCleSeule(); rendreReglagesTableau(); };

$('#form-energie').addEventListener('change', (e) => {
  if (e.target.name !== 'reserve' || !RESERVES[e.target.value]) return;
  reserve = e.target.value;
  try { ecrireJson(CLE_RESERVE, reserve); } catch (err) { /* reste en mémoire */ }
  majEtatCompte();
  majDetailEnergie();
});
$('#form-energie').addEventListener('submit', (e) => e.preventDefault());
$('#btn-recharger').addEventListener('click', () => {
  rechargerEnergie();
  majDetailEnergie();
});

$('#form-pomo').addEventListener('submit', (e) => {
  e.preventDefault();
  const lire = (id, min, max) => Math.min(max, Math.max(min, Math.round(Number($(id).value) || 0)));
  pomoDurees = { focus: lire('#pomo-focus', 5, 90), pause: lire('#pomo-pause', 1, 30), longue: lire('#pomo-longue', 5, 45) };
  try { ecrireJson(CLE_POMO_DUREES, pomoDurees); } catch (err) { /* reste en mémoire */ }
  // Un minuteur à l'arrêt prend tout de suite la nouvelle durée ; un minuteur lancé finit son tour.
  if (!pomo.fin) pomo.restant = dureePomo(pomo.mode);
  sauverPomo();
  afficherPomo();
  rendreReglagesTableau();
  message($('#pomo-message'), 'Durées enregistrées.', 'ok-bloc');
});

// Un autre onglet a changé l'agenda ou le minuteur : on suit.
window.addEventListener('storage', (e) => {
  if (e.key === CLE_EVALS || e.key === CLE_TACHES) {
    chargerAgenda();
    if (vueCourante === 'accueil') rendreAgenda();
  }
  if (e.key === CLE_POMO || e.key === CLE_POMO_DUREES) {
    clearInterval(pomoTic);
    chargerPomo();
  }
});
