# Potasse

Un générateur de QCM à partir de tes cours. Tu colles ta clé API Anthropic, tu importes un cours, le site te pose des questions dessus.

- **100 % dans ton navigateur.** Pas de serveur, pas de compte, pas de base de données.
- **Un seul fichier** : `index.html`. Pas de build, pas de framework, pas de `node_modules`.
- **Tu paies ce que tu consommes**, directement à Anthropic, avec ta propre clé. Le site t'affiche le coût estimé avant chaque génération, puis le coût réel juste après.

## Ce que ça fait

1. **Importer un cours** : texte collé, PDF, Word (.docx) ou photos de notes manuscrites. PDF et Word sont lus dans ton navigateur, sans rien envoyer. Les photos, elles, partent à l'API pour être transcrites (ça coûte des crédits, le site te le dit avant).
2. **Régler le QCM** : de 10 à 20 questions, une ou plusieurs bonnes réponses (ou un mélange), trois niveaux de difficulté (restitution, compréhension, application), une portée libre (« le chapitre 3 ») et le choix du modèle.
3. **Répondre** question par question, avec la correction et l'explication tout de suite.
4. **Voir ta note sur 20**, la correction complète, et **rejouer tes erreurs** gratuitement (aucun nouvel appel à l'API).
5. **Exporter la correction en PDF** via l'impression du navigateur.
6. **Suivre ta consommation** : total dépensé, répartition par modèle, liste des appels, et l'écart entre l'estimation et le coût réel.

## Créer une clé API

Un abonnement Claude Pro ou Max **ne marche pas** ici : l'API se paie à part, à l'usage.

1. Va sur [console.anthropic.com](https://console.anthropic.com) et crée un compte (ou connecte-toi).
2. Dans **Billing**, ajoute des crédits. Quelques dollars suffisent largement pour commencer.
3. Dans **API Keys**, clique sur **Create Key**, donne-lui un nom (par exemple « potasse »), puis copie la clé. Elle commence par `sk-ant-`. Elle ne s'affiche qu'une fois.
4. Colle-la dans Potasse, écran « Ta clé API », puis clique sur **Vérifier et continuer**.

Conseil : sur la console, tu peux fixer une **limite de dépense mensuelle** pour ton espace de travail. C'est la meilleure protection si ta clé fuite.

### Où va ta clé

- Elle est rangée dans le `localStorage` de ton navigateur, sur ton appareil.
- Elle est envoyée **uniquement** à `api.anthropic.com`, dans l'en-tête de chaque appel. Jamais ailleurs : le site n'a pas de serveur.
- Le bouton **Effacer ma clé** la supprime du navigateur.
- Sur un ordinateur partagé, efface-la après usage. Toute personne qui a accès à ton navigateur peut la lire.

Les appels partent directement du navigateur grâce à l'en-tête `anthropic-dangerous-direct-browser-access: true`. Le mot « dangerous » vise les sites qui embarqueraient **leur** clé dans le code : ici, chaque personne utilise **la sienne**.

## Combien ça coûte

Tarifs utilisés pour les calculs, en dollars par million de tokens :

| Modèle | ID API | Entrée | Sortie |
|---|---|---|---|
| Haiku 5.5 | `claude-haiku-5-5` | 0,10 | 0,50 |
| Sonnet 5.5 | `claude-sonnet-5-5` | 2,00 | 10,00 |
| Opus 5.5 | `claude-opus-5-5` | 4,00 | 20,00 |

Ordre de grandeur pour un cours de 10 pages (environ 30 000 caractères) et 12 questions : moins d'un dixième de centime avec Haiku, quelques centimes avec Sonnet, une dizaine de centimes avec Opus.

Le compteur de l'écran **Consommation** additionne ce que le site a lui-même consommé, d'après les tokens réellement facturés que renvoie l'API. Il ne connaît pas le solde de ton compte : vérifie-le sur la console.

### Ajuster l'estimation

Les constantes d'estimation sont en haut du `<script>` dans `index.html`, commentées :

```js
const CARACTERES_PAR_TOKEN = 3.6;  // tokens d'entrée ≈ caractères du cours / 3,6
const SURCHARGE_ENTREE = 600;      // + prompt système, consignes, outil
const TOKENS_PAR_QUESTION = 220;   // tokens de sortie par question
const MARGE_RAISONNEMENT = 1.6;    // raisonnement du modèle
```

L'écran Consommation affiche l'écart moyen entre l'estimation et le coût réel. S'il reste loin de 0, c'est ces valeurs qu'il faut corriger.

## Déployer sur GitHub Pages

1. Crée un dépôt sur GitHub (public, ou privé avec un compte qui le permet).
2. Dépose-y `index.html` et `README.md` à la racine : bouton **Add file > Upload files**, ou en ligne de commande :

   ```bash
   git init
   git add index.html README.md
   git commit -m "Potasse"
   git branch -M main
   git remote add origin https://github.com/TON-PSEUDO/potasse.git
   git push -u origin main
   ```

3. Dans le dépôt : **Settings > Pages**. Sous **Build and deployment**, choisis **Deploy from a branch**, branche `main`, dossier `/ (root)`, puis **Save**.
4. Attends une minute. Le site est en ligne à l'adresse `https://TON-PSEUDO.github.io/potasse/`.

Chaque personne qui ouvre le site utilise sa propre clé et garde ses cours dans son propre navigateur. Toi, tu n'héberges rien d'autre qu'un fichier statique.

## Tester sans clé : le mode démo

Ajoute `?demo=1` à l'adresse :

```
https://TON-PSEUDO.github.io/potasse/?demo=1
```

Le mode démo charge un cours d'exemple et rejoue un QCM factice de 12 questions. Aucune clé, aucun appel, aucun crédit dépensé. Les chiffres de consommation sont simulés, et toutes les données démo sont rangées à part (`potasse.demo.*`) : elles ne touchent pas à tes vrais cours.

En local, ouvre simplement `index.html` dans ton navigateur, ou lance un petit serveur :

```bash
python3 -m http.server 8000
```

puis va sur `http://localhost:8000/?demo=1`.

## Stockage

Tout est dans le `localStorage` du navigateur :

| Clé | Contenu |
|---|---|
| `potasse.cle` | ta clé API |
| `potasse.cours` | tes cours, leur texte et leur historique de QCM |
| `potasse.conso` | l'historique de consommation (500 lignes max, les plus anciennes partent en premier) |

Le navigateur accorde environ 5 Mo par site. Si c'est plein, le site te le dit et te propose de supprimer un cours. Vider les données du site dans ton navigateur efface tout, clé comprise.

## Détails techniques

- Génération : un seul appel à l'API Messages, avec l'outil `creer_qcm` en mode `strict` pour obtenir un JSON conforme au schéma. Sonnet 5.5 et Opus 5.5 refusent le `tool_choice` forcé (`{"type": "tool"}`), donc l'appel utilise `tool_choice: auto` et le prompt système impose l'outil. Si le modèle répond sans l'appeler, le site propose de relancer.
- Sur Sonnet 5.5 et Opus 5.5, le repli côté serveur (`fallbacks: "default"`) est activé : si le modèle décline une requête, l'API la relance sur un autre modèle.
- Validation côté client : une question annoncée « unique » avec plusieurs bonnes réponses est traitée comme « multiple ». Les questions mal formées sont écartées.
- Bibliothèques chargées à la demande depuis cdnjs : [pdf.js 3.11.174](https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/) pour les PDF, [mammoth 1.6.0](https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/) pour les .docx.
- Polices : Archivo Black et Space Grotesk, via Google Fonts.
