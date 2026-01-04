# Système de Calcul et de Conversion - Vape Tracker Pro

Ce document détaille l'intégralité des formules mathématiques, des constantes de calibration et de la logique utilisée par l'application pour suivre la consommation et prédire la durée de vie de la résistance.

## 1. Le Modèle "Physique" (Constantes de Calibration)

Le cœur du système repose sur des constantes définies dans `client/src/lib/storage.ts`. Ces valeurs modélisent le comportement physique d'une cigarette électronique spécifique (type tirage indirect/RDL).

| Constante | Valeur | Unité | Description |
| :--- | :--- | :--- | :--- |
| `V_MAX_COIL` | **45.0** | ml | **Capacité théorique maximale** de liquide qu'une résistance peut vaporiser avant d'être dégradée. |
| `S_COEFF` | **0.75** | - | **Coefficient de Sécurité / Encrassement**. Il réduit la capacité théorique pour donner une durée de vie "réelle" et sûre. (75% de la capacité max). |
| `PUFF_RATIO` | **100.4** | taffes/ml | **Ratio de consommation**. Nombre moyen de taffes nécessaires pour consommer exactement 1 ml de liquide. |
| `WEAR_LIMIT` | **100** | % | Seuil maximal d'usure affiché. |

---

## 2. Formules de Conversion

### A. Calcul de la Consommation (Taffes $\rightarrow$ Liquide)

L'application ne mesure pas directement le liquide consommé (pas de capteur physique). Elle l'estime mathématiquement à partir du compteur de taffes.

$$ \text{Volume Consommé (ml)} = \frac{\text{Nombre Total de Taffes}}{\text{PUFF_\text{RATIO}}} $$

*Exemple :* Pour 500 taffes, $\frac{500}{100.4} \approx 4.98 \text{ ml}$.

### B. Calcul de l'Usure de la Résistance (%)

L'usure est calculée en fonction du volume de liquide passé à travers la résistance par rapport à sa capacité de vie maximale ajustée.

1.  **Calcul de la Vie Maximale Réelle (en ml) :**
    $$ \text{Vie Max (ml)} = \frac{\text{V_\text{MAX_\text{COIL}}}}{\text{S_\text{COEFF}}} = \frac{45.0}{0.75} = \mathbf{60 \text{ ml}} $$
    *Le système considère que la résistance est "morte" après avoir vaporisé 60 ml.*

2.  **Calcul du Pourcentage d'Usure :**
    $$ \text{Usure (\%)} = \left( \frac{\text{Volume Consommé (ml)}}{\text{Vie Max (ml)}} \right) \times 100 $$

---

## 3. Prédictions (Estimation de Fin de Vie)

Ces calculs sont effectués dynamiquement dans l'interface (`Dashboard.tsx`) pour estimer quand le changement sera nécessaire.

### A. Cible d'Utilisation
Le système utilise une moyenne de référence fixe pour stabiliser les prédictions, évitant que la date de changement ne saute d'un jour à l'autre si vous vapez moins une journée.

*   **Moyenne Cible :** **150 taffes / jour**

### B. Estimation de la Durée Restante
1.  **Calcul du "Budget Taffes" Total :**
    $$ \text{Vie Max (Taffes)} = \text{Vie Max (ml)} \times \text{PUFF_\text{RATIO}} = 60 \times 100.4 = \mathbf{6024 \text{ taffes}} $$

2.  **Calcul du Reste à Faire :**
    $$ \text{Taffes Restantes} = \text{Vie Max (Taffes)} - \text{Compteur Actuel} $$

3.  **Conversion en Jours :**
    $$ \text{Jours Restants} = \frac{\text{Taffes Restantes}}{150} $$

---

## 4. Gestion du Stock de Liquide (Restant)

Le stock de liquide affiché dans le réservoir/flacon est une simple soustraction comptable.

$$ \text{Stock Restant (ml)} = \sum(\text{Ajouts Liquide}) - \text{Volume Consommé (calculé)} $$

*Note : C'est pour cette raison qu'il est crucial d'entrer les ajouts de liquide (remplissages), sinon le stock tombera en négatif ou restera à zéro.*

## 5. Sources des Données

Les valeurs utilisées (`100.4` taffes/ml, `60` ml de vie) ne proviennent pas d'une base de données constructeur publique. Elles sont issues d'une **calibration empirique** (basée sur l'observation réelle) intégrée dans le code source (`vape_tracker_data_v13_calibrated`).

*   **Cohérence :** Ces chiffres correspondent à un profil de vapotage **MTL/RDL** (Tirage serré à modéré) sur des résistances de type **0.4Ω - 0.8Ω** à des puissances modérées (15-25W).
