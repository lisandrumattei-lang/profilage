# Profilage

Application mobile de suivi d’activité, de nutrition et de ressenti, construite avec **Expo SDK 57, React Native et TypeScript**. Interface française, thème sombre, iOS et Android. L’inspiration WHOOP concerne le suivi quotidien et la présentation ; aucune affiliation ni connexion à WHOOP n’est intégrée.

## Fonctionnalités

- Tableau de bord : énergie ressentie sur 5, sommeil saisi, temps actif, alimentation et hydratation.
- Activités : nom, durée et effort perçu sur 10. Charge déclarée = minutes × effort perçu, sans mesure biométrique.
- Nutrition : journal des repas, calories, protéines, glucides, lipides et exemples de repas modifiables.
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

Le mode hors ligne d’Expo évite ses appels de découverte ; `npm ci` a besoin de `registry.npmjs.org`. Le mode sans affichage désactive le lancement du débogueur graphique natif, qui nécessite un environnement de bureau. Les processus de développement doivent être relancés après restauration de l’environnement. Aucun secret ni service externe n’est requis pour le fonctionnement actuel.

## Organisation

- `App.tsx` : interface, navigation entre onglets, formulaires et intégration du stockage.
- `src/model.ts` : types du journal, calculs, mises à jour et validation des données enregistrées.
- `tests/model.test.ts` : tests de logique métier exécutés avec le runner Node.js.
- `app.json` : identité et configuration Expo.

## Limites de cette première version

Les données restent sur l’appareil via AsyncStorage, sans compte, serveur ni synchronisation. AsyncStorage n’est pas un coffre chiffré. Les exemples alimentaires sont des estimations saisies, sans catalogue externe. Il n’y a pas d’intégration Apple Health, Health Connect, de montre ou de capteur ; le sommeil et l’énergie sont déclarés par l’utilisateur.

La compilation des bundles mobiles a été vérifiée en cloud, ainsi que les parcours de l’interface partagée dans un navigateur. Le comportement natif doit encore être testé sur un téléphone ou un émulateur avant distribution. Une publication dans les stores nécessitera des builds signés et les comptes développeur correspondants.
