---
name: adr-options-comparison
description: Comparer les options d'une décision d'architecture avant d'écrire l'ADR (critères, compromis, sources, recommandation). À lancer pour une issue de décision d'architecture ou un changement qui introduit une technologie, une contrainte transverse ou un format. Lancée par `architect`.
---

# Comparaison d'options avant un ADR

Tu compares, tu ne décides pas : l'ADR se crée ensuite avec `archgate adr create`, et son acceptation appartient à l'utilisateur.

1. Reformule la décision à prendre, ses contraintes et ce qui est hors périmètre.
2. Lis les ADR existants (`archgate adr list`, `archgate adr show <id>`) : une règle déjà décidée s'applique avant d'en proposer une autre.
3. Retiens au moins deux options. Pour chacune : fonctionnement, adéquation à chaque critère tiré des contraintes et des objectifs de qualité du projet, coûts (outillage et gratuité compris), risques, réversibilité.
4. Appuie chaque affirmation factuelle sur une source consultée (URL, ADR, fichier du dépôt) ; marque « non vérifié » sinon.
5. Rends un tableau critères × options, une recommandation argumentée et les questions restées ouvertes.
