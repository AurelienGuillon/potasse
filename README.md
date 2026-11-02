# Potasse

Une plateforme de révision qui tourne entièrement dans ton navigateur. Tu branches ta clé API Anthropic, tu importes tes cours, et Claude t'aide à réviser : fiches pratiques, QCM corrigés, le tout avec un Pomodoro et une to-do sous les yeux.

- **100 % dans ton navigateur.** Pas de serveur, pas de compte, pas de base de données.
- **HTML, CSS et JavaScript, sans build.** Pas de framework, pas de `node_modules`.
- **Tu paies ce que tu consommes**, directement à Anthropic, avec ta propre clé.

En ligne : <https://aurelienguillon.github.io/potasse/>

## Ce que ça fait

### Le tableau de bord

- **Pomodoro** toujours visible en haut : 25 minutes de focus, 5 de pause, une grande pause de 15 minutes toutes les 4 sessions. Il continue de tourner si tu changes de page ou recharges l'onglet. Durées réglables.
- **✦ Énergie Claude** : une jauge façon barre d'endurance qui montre la part de ta réserve du jour déjà utilisée, en pourcentage plutôt qu'en euros. Elle se recharge à minuit.
- **Agenda** : un mini-calendrier avec tes prochaines évals et un compte à rebours (J-3, J-10…).
- **To-do priorisée** : chaque tâche a une priorité et peut être liée à une éval. Les tâches liées à une éval proche remontent en tête. Quand tu valides une tâche, un tampon « VALIDÉ » s'imprime sur la ligne.

### Les fiches pratiques

1. Choisis un de tes cours (ou importe-en un nouveau).
2. Claude en tire une fiche structurée : résumé, sections, définitions clés, encadré « À retenir », pièges à éviter.
3. La fiche est à toi : un éditeur intégré te laisse couper, réécrire, surligner, ajouter des titres. Tout s'enregistre au fil de l'eau.
4. Imprime-la ou enregistre-la en PDF. Chaque fiche porte la mention « Généré par Potasse x Claude ».

### L'espace quiz

1. **Importer un cours** : texte collé, PDF, Word (.docx) ou photos de notes manuscrites. PDF et Word sont lus dans ton navigateur, sans rien envoyer. Les photos partent à l'API pour être transcrites.
2. **Régler le QCM** : de 10 à 20 questions, une ou plusieurs bonnes réponses (ou un mélange), trois difficultés (restitution, compréhension, application) et une portée libre (« le chapitre 3 »).
3. **Répondre** question par question, avec la correction et l'explication tout de suite.
4. **Voir ta note sur 20**, la correction complète, et **rejouer tes erreurs** sans nouvel appel à l'API.
5. **Exporter la correction en PDF.**

Pour essayer sans clé : dans l'espace quiz, ajoute le cours d'exemple, puis lance « Tester avec le QCM factice ».

## Créer une clé API

Un abonnement Claude Pro ou Max **ne marche pas** ici : l'API se paie à part, à l'usage.

1. Va sur [console.anthropic.com](https://console.anthropic.com) et crée un compte (ou connecte-toi).
2. Dans **Billing**, ajoute des crédits. Quelques dollars suffisent pour commencer.
3. Dans **API Keys**, clique sur **Create Key**, puis copie la clé. Elle commence par `sk-ant-` et ne s'affiche qu'une fois.
4. Dans Potasse, ouvre **Réglages** et colle-la.

Conseil : sur la console, fixe une **limite de dépense mensuelle**. C'est la meilleure protection si ta clé fuite.

### Où va ta clé

- Elle est rangée dans le `localStorage` de ton navigateur, sur ton appareil.
- Elle est envoyée **uniquement** à `api.anthropic.com`. Le site n'a pas de serveur.
- Le bouton **Oublier la clé** la supprime du navigateur.
- Sur un ordinateur partagé, efface-la après usage : toute personne qui a accès à ton navigateur peut la lire.

Les appels partent directement du navigateur grâce à l'en-tête `anthropic-dangerous-direct-browser-access: true`. Le mot « dangerous » vise les sites qui embarqueraient **leur** clé dans le code : ici, chaque personne utilise **la sienne**.

## Combien ça coûte

Potasse utilise **Claude Opus 5.5** (`claude-opus-5-5`) : 4 $ par million de tokens en entrée, 20 $ en sortie. Les trois niveaux proposés (Rapide, Standard, Approfondi) règlent l'effort de réflexion du modèle : plus c'est approfondi, plus c'est lent et cher.

La jauge d'énergie compte en « unités » : un token d'entrée vaut 1, un token de sortie vaut 5 (le rapport de prix entre les deux). Trois tailles de réserve au choix dans les réglages :

| Réserve | Unités par jour | Équivalent approximatif |
|---|---|---|
| Petite | 250 000 | 1 $ |
| Moyenne | 1 000 000 | 4 $ |
| Grande | 3 000 000 | 12 $ |

La jauge est une estimation faite dans ton navigateur, et ce n'est pas un plafond : à 100 %, Potasse te prévient mais ne bloque rien. Le décompte exact et ton solde sont sur la console Anthropic.

## Lancer en local

Ouvre `index.html` dans ton navigateur (double-clic), ou lance un petit serveur :

```bash
python3 -m http.server 8000
```

puis va sur `http://localhost:8000/`.

## Déployer sur GitHub Pages

1. Pousse le dépôt sur GitHub.
2. Dans **Settings > Pages**, sous **Build and deployment**, choisis **Deploy from a branch**, branche `main`, dossier `/ (root)`, puis **Save**.
3. Une minute plus tard, le site est en ligne sur `https://TON-PSEUDO.github.io/potasse/`.

Chaque personne qui ouvre le site utilise sa propre clé et garde ses données dans son propre navigateur.

## Organisation du code

| Fichier | Rôle |
|---|---|
| `index.html` | toutes les vues (tableau de bord, fiches, quiz, réglages) |
| `css/style.css` | la direction artistique « soft brutalism » |
| `js/app.js` | outils communs, stockage, appel à l'API, jauge d'énergie, import de cours et QCM |
| `js/tableau.js` | Pomodoro, agenda, to-do et tableau de bord |
| `js/fiches.js` | génération et éditeur de fiches |
| `js/demarrage.js` | lancement de l'application, chargé en dernier |

## Stockage

Tout est dans le `localStorage` du navigateur :

| Clé | Contenu |
|---|---|
| `potasse:cle-api` | ta clé API |
| `potasse:cours` | tes cours, leur texte et leur historique de QCM |
| `potasse:fiches` | tes fiches pratiques |
| `potasse:evals`, `potasse:taches` | l'agenda et la to-do |
| `potasse:energie`, `potasse:reserve` | la jauge du jour et la taille de la réserve |
| `potasse:pomodoro`, `potasse:pomodoro-durees` | l'état du minuteur et ses durées |

Le navigateur accorde environ 5 Mo par site. Si c'est plein, Potasse te le dit. Vider les données du site efface tout, clé comprise. Rien n'est synchronisé entre appareils.

## Détails techniques

- Appels à l'API Messages en streaming, avec une sortie JSON imposée par schéma (`output_config.format`) pour les QCM et les fiches.
- Repli côté serveur activé (`fallbacks: "default"`) : si le modèle décline une demande, l'API la relance sur un autre modèle.
- Validation côté client : une question annoncée « unique » avec plusieurs bonnes réponses est traitée comme « multiple ». Les questions mal formées sont écartées.
- Bibliothèques chargées à la demande depuis cdnjs : [pdf.js 3.11.174](https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/) pour les PDF, [mammoth 1.6.0](https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/) pour les .docx, [jsPDF 2.5.1](https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/) pour l'export de la correction.
- Polices : Fraunces, Space Grotesk et Space Mono, via Google Fonts.
