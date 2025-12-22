# Instructions de Déploiement du Smart Contract avec Paiements

## Modifications Apportées

Le smart contract `ContractRegistry.sol` a été mis à jour pour inclure :
- Gestion des paiements avec montants distincts pour chaque partie
- Fonction `makePayment()` pour effectuer les paiements en ETH
- Suivi automatique du statut de paiement
- Événements `PaymentMade` et `ContractCompleted`

## Étapes de Déploiement

### 1. Compiler le Smart Contract

```bash
cd blockchain
npx hardhat compile
```

### 2. Déployer sur Localhost (Test)

Terminal 1 - Démarrer le nœud local :
```bash
npx hardhat node
```

Terminal 2 - Déployer :
```bash
npx hardhat run scripts/deploy.ts --network localhost
```

**Important:** Copiez l'adresse du contrat déployé et mettez-la à jour dans :
- `frontend/src/lib/web3.ts` → `CONTRACT_REGISTRY_ADDRESS`

### 3. Déployer sur un Testnet (Optionnel)

Pour Sepolia Testnet :
```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

## Utilisation

### Workflow de Paiement

1. **L'initiateur définit les montants** dans l'interface web
   - Montant total du contrat
   - Part de l'initiateur
   - Part de la contrepartie

2. **Enregistrement sur blockchain** (automatique lors de la définition des montants)
   ```javascript
   await registerOnBlockchain(contractId, hash, counterpartyAddress, initiatorAmount, counterpartyAmount)
   ```

3. **Chaque partie effectue son paiement**
   - Cliquer sur "💰 Payer via Blockchain"
   - Confirmer la transaction dans MetaMask
   - Le paiement est automatiquement enregistré

4. **Contrat complet**
   - Quand les deux parties ont payé
   - Le statut passe à "completed"
   - Le hash blockchain est enregistré
   - Bouton "Voir sur Blockchain" devient disponible

## Fonctions du Smart Contract

### `registerContract()`
Enregistre un nouveau contrat avec les montants de paiement.

### `makePayment()`
Effectue un paiement pour sa part du contrat.
- Vérifie que le montant envoyé correspond exactement à la part due
- Marque automatiquement le paiement comme effectué
- Émet l'événement `ContractCompleted` quand les deux parties ont payé

### `getContract()`
Récupère les informations d'un contrat incluant les statuts de paiement.

### `isFullyPaid()`
Vérifie si les deux parties ont payé.

## Notes Importantes

1. **Les montants sont en ETH** - Les valeurs dans l'interface sont converties automatiquement
2. **Transactions irréversibles** - Les paiements blockchain ne peuvent pas être annulés
3. **Gas fees** - Chaque transaction nécessite des frais de gas
4. **MetaMask requis** - Les utilisateurs doivent avoir MetaMask installé

## Dépannage

### Erreur "Contract ID already exists"
Le contrat a déjà été enregistré sur la blockchain. Utilisez un nouvel ID.

### Erreur "Incorrect payment amount"
Le montant envoyé ne correspond pas exactement à la part due. Vérifiez les montants.

### Transaction échouée
- Vérifiez que vous avez assez d'ETH pour le paiement + gas fees
- Assurez-vous que MetaMask est connecté au bon réseau
- Vérifiez que le smart contract est déployé à la bonne adresse
