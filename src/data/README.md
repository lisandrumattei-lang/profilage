# Catalogue alimentaire Ciqual 2025

Source : **Anses. 2025. Table de composition nutritionnelle des aliments Ciqual.** https://ciqual.anses.fr/

Le fichier `ciqual-2025.json` contient les 3 484 aliments du CSV français `CIQUAL2025_FR_2025_11_03.csv`, repris depuis le miroir public Open Food Facts à la révision `4ae1e39fa6882a83bd76f3924911e07baeb4922d` :

https://github.com/openfoodfacts/openfoodfacts-server/blob/4ae1e39fa6882a83bd76f3924911e07baeb4922d/external-data/ciqual/ciqual/CIQUAL2025_FR_2025_11_03.csv

Chaque ligne JSON contient `[code Ciqual, nom français, énergie kcal/100 g (règlement UE 1169/2011), protéines g/100 g (facteur de Jones), glucides g/100 g, lipides g/100 g]`. Les virgules décimales sont converties en points. Les cellules manquantes, les traces et les bornes `<…` sont conservées comme données non chiffrables (`null`) ; elles ne sont pas remplacées par zéro. Les noms et codes restent ceux de la table source.

Les données sont reproduites avec indication explicite de leur source, Anses/Ciqual, dans l’interface et cette documentation. Consultez le site Ciqual pour les conditions de réutilisation et la méthodologie. Le fichier original et le présent extrait ne contiennent aucune donnée personnelle.

Les produits de marque sont recherchés séparément et en ligne via Open Food Facts. Leur base est sous ODbL et leurs contenus sous DbCL : https://world.openfoodfacts.org/terms-of-use. Les contributions alimentaires ne sont pas garanties complètes ; vérifiez les fiches avec les étiquettes des produits.
