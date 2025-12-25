# Contract Agreement State Flow - Fixed

## Issue Summary
Previously, when a user purchased a contract template and navigated to the contract details page, the system automatically marked both parties as "agreed" even though:
- User A (buyer) hadn't explicitly accepted the contract
- User B (counterparty) hadn't even been selected yet

## Fixed Behavior

### State Flow Diagram
```
CREATED (draft) 
    ↓
PURCHASED (template purchased, no counterparty yet)
    ↓
PENDING_COUNTERPARTY (counterparty assigned, awaiting acceptance)
    ↓
PENDING_ACCEPTANCE (one party has accepted, waiting for the other)
    ↓
FULLY_SIGNED (both parties accepted)
    ↓
ARCHIVED (moved to signed_contracts table)
```

### State Descriptions

1. **`draft`**: Initial state when a contract is created manually (not from template)
2. **`purchased`**: Contract created from a purchased template, buyer is set as initiator, counterparty is NULL
3. **`pending_counterparty`**: Counterparty has been assigned to the contract via invite
4. **`pending_acceptance`**: One party has explicitly accepted, waiting for the other party's acceptance
5. **`fully_signed`**: Both parties have explicitly accepted the contract
6. **`archived`**: Contract moved to `signed_contracts` table after both signatures

## Key Changes Made

### 1. Database Schema (`update_contracts_schema.sql`)
- **Changed**: `counterparty_id` from `NOT NULL` to nullable
- **Reason**: Purchased templates don't have a counterparty initially
- **Impact**: Allows contracts to exist without an assigned counterparty

### 2. Backend Service (`contracts.service.ts`)

#### `createContractFromTemplate` Method
```typescript
// Before
status: 'draft',
initiator_agreed: false,
counterparty_agreed: false,

// After
status: 'purchased',  // Indicates template was purchased
initiator_agreed: false,  // Must explicitly accept
counterparty_agreed: false,
```

#### `acceptContract` Method
Added validation:
- Cannot accept if `counterparty_id` is NULL
- Status transitions to `pending_acceptance` after first acceptance
- Status transitions to `fully_signed` only when both parties accept

### 3. Contract Interface
```typescript
interface Contract {
  counterparty_id: number | null;  // Changed from number
  status: string;  // Added comments for valid values
  initiator_agreed: boolean;
  counterparty_agreed: boolean;
  // ... other fields
}
```

### 4. Frontend UI (`contracts/[id]/page.tsx`)

#### Status Badge
Now shows:
- **"Acheté - Assigner une contrepartie"** - Purple badge for `purchased` status
- **"En attente de contrepartie"** - Yellow badge for `pending_counterparty`
- **"En attente d'acceptation"** - Blue badge for `pending_acceptance`
- **"✓ Signé"** - Green badge for `fully_signed`

#### Accept Button
- Only shown when `counterparty_id` is not NULL
- Hidden when no counterparty is assigned with warning message
- Shows user's acceptance status

#### Counterparty Assignment
- Shows invitation UI when `counterparty_id` is NULL and user is initiator
- Allows searching and inviting a counterparty
- Updates status to `pending_counterparty` upon invitation

## Migration Instructions

### For Existing Databases
Run the migration script:
```bash
# In Supabase SQL Editor, run:
backend_nest/fix_contract_agreement_flow.sql
```

This script will:
1. Allow NULL values for `counterparty_id`
2. Update existing contracts to appropriate statuses
3. Ensure all boolean fields have correct defaults

### Testing the Fix

1. **Purchase a Template**
   - Purchase a contract template from marketplace
   - Verify status is `purchased`
   - Verify `initiator_agreed` is `false`
   - Verify `counterparty_id` is `NULL`

2. **Assign Counterparty**
   - Navigate to contract details
   - Click "Inviter une contrepartie"
   - Select a user
   - Verify status changes to `pending_counterparty`
   - Verify `counterparty_id` is set

3. **Accept Contract (User A)**
   - User A clicks "J'accepte ce contrat"
   - Verify `initiator_agreed` becomes `true`
   - Verify status changes to `pending_acceptance`
   - Verify contract is NOT marked as fully signed

4. **Accept Contract (User B)**
   - User B opens the contract
   - User B clicks "J'accepte ce contrat"
   - Verify `counterparty_agreed` becomes `true`
   - Verify status changes to `fully_signed`
   - Verify contract moves to `signed_contracts` table

## API Endpoints Affected

### `POST /contracts/:id/invite`
- Assigns a counterparty to a contract
- Updates status from `purchased` to `pending_counterparty`

### `POST /contracts/:id/accept`
- Marks user's agreement as `true`
- Transitions status based on both parties' agreement
- Returns error if no counterparty assigned

### `GET /contracts/:id`
- Returns contract with nullable `counterparty_id`
- Shows current agreement status for both parties

## Security Considerations

1. **Authorization**: Users can only accept contracts they're part of (initiator or counterparty)
2. **Validation**: Cannot accept a contract without an assigned counterparty
3. **Immutability**: Once both parties accept, contract moves to `signed_contracts` and original is archived

## Related Files Changed

- `backend_nest/update_contracts_schema.sql` - Schema updates
- `backend_nest/fix_contract_agreement_flow.sql` - Migration script
- `backend_nest/src/contracts/interfaces/contract.interface.ts` - Interface updates
- `backend_nest/src/contracts/contracts.service.ts` - Business logic
- `frontend/src/app/contracts/[id]/page.tsx` - UI updates

## Future Enhancements

Consider implementing:
1. Email notifications when counterparty is assigned
2. Reminders for pending acceptances
3. Time limits for acceptance
4. Contract expiration for unsigned contracts
5. Audit log for state transitions
