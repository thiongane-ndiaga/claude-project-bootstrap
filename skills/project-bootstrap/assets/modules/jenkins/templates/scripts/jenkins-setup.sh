#!/bin/sh
# Chaîne d'outils du projet sur l'agent Jenkins (équivalent de .github/actions/project-setup).
# Fichier propre au projet : créé une fois, jamais écrasé par une mise à jour du plugin.
# Installe ici le langage, le gestionnaire de dépendances et les dépendances de la stack choisie,
# avant « node .bootstrap/run-checks.mjs ». Exemple : npm ci, pip install -r requirements.txt.
set -eu
