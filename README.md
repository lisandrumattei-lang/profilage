# Profilage

Application mobile de suivi d’activité, de nutrition et de ressenti, construite avec **Expo SDK 57, React Native et TypeScript**. Interface française, thème sombre, iOS et Android. L’inspiration WHOOP concerne le suivi quotidien et la présentation ; aucune affiliation ni connexion à WHOOP n’est intégrée.

## Fonctionnalités

- Tableau de bord : énergie ressentie sur 5, sommeil saisi, temps actif, alimentation et hydratation.
- Activités : nom, durée et effort perçu sur 10. Charge déclarée = minutes × effort perçu, sans mesure biométrique.
- Nutrition : journal des repas, calories, protéines, glucides, lipides et exemples de repas modifiables.
- Catalogue local **Anses Ciqual 2025 : 3 484 aliments et plats**, disponible hors ligne ; recherche de marques et produits emballés via **Open Food Facts** en ligne.
- Scan des codes-barres EAN-8, EAN-13, UPC-A et ITF-14, ou saisie des chiffres ; quantités consommées et calcul des apports au prorata.
- Photos de repas prises avec la caméra ou choisies dans la photothèque, conservées localement avec le journal.
- Import manuel d’activités Garmin au format TCX, avec durée, distance, date et effort perçu saisi par l’utilisateur ; les doublons sont refusés.
- Hydratation par incréments de 250 ml ; objectifs personnels réglables.
- Navigation entre les journées et graphique des sept derniers jours.
- Sauvegarde locale automatique, suppression des entrées et effacement du journal avec confirmation.

Le premier lancement est prérempli avec des **données de démonstration** clairement indiquées. Utilisez « Effacer » pour commencer votre propre journal. Les objectifs proposés sont des valeurs d’exemple, sans calcul personnalisé.

## Lancer sur téléphone

Prérequis : Node.js **24 LTS**, npm et une version d’Expo Go compatible avec SDK 57. À exécuter sur un ordinateur auquel le téléphone peut accéder sur le même réseau :

```bash
cd profilage
npm ci
npm start
```

Ouvrez le projet dans Expo Go via le QR code du terminal. Le serveur cloud n’est pas directement accessible à un téléphone extérieur ; pour un essai sur appareil, lancez ces commandes sur votre ordinateur.

`npm run android` ouvre un émulateur Android installé localement ; `npm run ios` nécessite macOS et le simulateur Xcode. `npm run web` permet de vérifier l’interface et les parcours partagés dans un navigateur.

## Vérifications

```bash
npm run typecheck
npm test
npm run export
```

`npm run export` compile les bundles JavaScript/Hermes pour iOS et Android ainsi que la version web, dans `dist/`. Cette commande ne produit pas d’APK ni d’application iOS signée. Les tests vérifient les journées, les totaux alimentaires, la charge déclarée, les bornes de saisie et la validation du stockage.

## Environnement cloud

Le dépôt se trouve dans `/workspace/profilage`. Utilisez le checkout existant ; chaque tâche est déjà isolée et ne nécessite pas de worktree supplémentaire.

```bash
cd /workspace/profilage
export npm_config_cache=/workspace/.npm-cache
export EXPO_NO_TELEMETRY=1
export EXPO_UNSTABLE_HEADLESS=1
npm ci
EXPO_OFFLINE=1 npm run typecheck
npm test
EXPO_OFFLINE=1 npm run export
EXPO_OFFLINE=1 npm run web -- --port 8081
```

Le mode hors ligne d’Expo évite ses appels de découverte ; `npm ci` a besoin de `registry.npmjs.org`. Le mode sans affichage désactive le lancement du débogueur graphique natif, qui nécessite un environnement de bureau. Les processus de développement doivent être relancés après restauration de l’environnement. Aucun secret n’est nécessaire. Les recherches Open Food Facts et codes-barres nécessitent l’accès HTTPS à `world.openfoodfacts.org` ; le catalogue Ciqual et la saisie manuelle fonctionnent hors ligne. Le mode hors ligne **du CLI Expo** ne désactive pas les requêtes de l’application.

## Utiliser les nouvelles fonctions sur iPhone

Dans **Nutrition**, « Rechercher » donne accès à deux catalogues : les aliments et plats Ciqual, puis les produits de marque Open Food Facts. Choisissez la fiche correspondant au bon état de préparation (cru, cuit, avec sauce…), puis saisissez la quantité consommée. Les champs nutritionnels manquants restent vides et doivent être complétés avec l’étiquette ; ils ne sont pas assimilés à zéro.

« Code-barres » ouvre le scanner. Autorisez la caméra lorsque vous choisissez de l’activer. Si le produit est absent, vous pouvez saisir ses chiffres ou renseigner manuellement le repas. Les requêtes sont limitées pour respecter le service public ; une nouvelle tentative immédiate peut demander d’attendre quelques secondes.

Dans le formulaire d’un repas, « Prendre une photo » et « Photothèque » ajoutent une image. La photo est compressée et copiée dans le stockage privé de l’app sur iPhone/Android. Sur web, une petite image JPEG est conservée avec le journal. Les photos ne sont envoyées à aucun service et **ne donnent pas automatiquement une estimation des calories**. Une photo abandonnée est supprimée ; une photo enregistrée est retirée après sauvegarde réussie de la suppression du repas.

Dans **Activité → Importer depuis Garmin**, ouvrez Garmin Connect sur votre Mac, sélectionnez une activité et utilisez **Exporter au format TCX**. Placez le fichier dans iCloud Drive, sélectionnez-le dans Profilage sur l’iPhone, vérifiez l’aperçu, renseignez l’effort perçu et confirmez. L’import utilise la date de l’activité, pas la journée actuellement affichée. Un fichier avec une seule activité, inférieur à 2 Mo et entre 1 et 600 minutes est pris en charge. Le fichier est analysé localement et un nouvel import de la même activité est refusé.

## Garmin : prérequis de la synchronisation automatique

Le lien vers Garmin Connect ouvre le service officiel, mais **ne connecte pas le compte à Profilage**. La synchronisation automatique n’est pas implémentée : elle nécessite une application approuvée dans le programme officiel Garmin Connect Developer/Health, ses paramètres d’autorisation et un serveur chargé des échanges et du stockage des jetons. Aucune API privée ou collecte de mot de passe Garmin n’est utilisée. Sans cet accès, l’import TCX constitue le transfert manuel disponible. Il n’importe pas le sommeil, la fréquence cardiaque ou les scores Garmin.

## Sources nutritionnelles

**Anses. 2025. Table de composition nutritionnelle des aliments Ciqual.** https://ciqual.anses.fr/ — voir `src/data/README.md` pour la provenance de l’extrait, ses 3 484 lignes et les transformations numériques.

**Open Food Facts** : base ODbL et contenus DbCL, https://world.openfoodfacts.org/terms-of-use. Seules les informations publiques des produits sont lues ; aucune photo de plat, journal ni compte utilisateur n’est transmis. L’API v2 de lecture et la recherche textuelle historique sont utilisées car elles restent prises en charge et exposent les valeurs par 100 g/ml. Le service peut évoluer. Avant diffusion à grande échelle, déclarer l’usage du service à Open Food Facts selon sa documentation officielle.

Les valeurs Ciqual sont des moyennes, les fiches Open Food Facts sont collaboratives. Cette combinaison étend la couverture aux aliments génériques et aux produits emballés ; elle ne garantit pas la présence de tout aliment ou la précision d’une recette maison.

## Organisation

- `App.tsx` : interface, navigation entre onglets, formulaires et intégration du stockage.
- `src/model.ts` : types du journal, calculs, mises à jour et validation des données enregistrées.
- `src/food.ts` et `src/NutritionBrowser.tsx` : consultation du catalogue, recherche de produits, scan et portions.
- `src/ciqual.ts` et `src/data/` : catalogue Anses intégré et recherche hors ligne.
- `src/photos.ts` : choix, compression, conservation et suppression des photos locales.
- `src/garmin.ts` et `src/GarminImport.tsx` : validation, aperçu et import de fichiers TCX.
- `tests/model.test.ts` : tests de logique métier exécutés avec le runner Node.js.
- `app.json` : identité et configuration Expo.

## Limites de cette première version

Les données restent sur l’appareil via AsyncStorage et des fichiers locaux, sans compte, serveur ni synchronisation. AsyncStorage n’est pas un coffre chiffré. Les exemples alimentaires sont des estimations saisies. La synchronisation Garmin automatique, Apple Health et Health Connect ne sont pas intégrées ; le sommeil et l’énergie restent déclarés par l’utilisateur.

Les tests de logique couvrent le journal, les codes-barres, les portions, les réponses API simulées, le catalogue Ciqual et les imports TCX. Les requêtes Open Food Facts réelles nécessitent l’autorisation réseau du cloud ; une réussite avec des réponses simulées ne valide pas ce service distant. Le comportement natif de la caméra, du scan et du stockage photo doit être testé sur un téléphone ou un émulateur avant distribution. Une publication dans les stores nécessitera des builds signés et les comptes développeur correspondants.
