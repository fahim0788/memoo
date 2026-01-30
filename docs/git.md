Commande	                                                                Ce que ça fait
git status	                                                                Affiche l’état du dépôt : fichiers modifiés, ajoutés, non suivis
git add .	                                                                Ajoute tous les fichiers au prochain commit (zone de staging)
git commit -m "Initial commit"	                                            Crée un commit avec les fichiers ajoutés et un message
git remote add origin https://github.com/TON_USER/NOM_DU_REPO.git	        Lie le dépôt local au repo GitHub distant nommé origin
git remote -v	                                                            Affiche les URLs des dépôts distants configurés
git branch -M main	                                                        Renomme la branche courante en main (force si besoin)
git push -u origin main	                                                    Envoie la branche main sur GitHub et la définit comme branche par défaut