'use strict';

/* =====================================================================
   DÉMARRAGE : chargé en dernier, quand tous les modules sont en place
   ===================================================================== */

initCapacites();   // cours, clé API, énergie
chargerAgenda();
chargerFiches();
chargerPomo();
aller('accueil');
