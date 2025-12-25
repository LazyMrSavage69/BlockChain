# Fix: Purchased Contracts Not Showing in Contracts Page

## Issue
After purchasing a contract template from the marketplace, the contract was not appearing in the user's contracts list on `/contractspage`.

## Root Causes Identified

### 1. Missing Status Badge
The `getStatusBadge` function in the contracts page didn't have a mapping for the new `'purchased'` status, causing purchased contracts to display with incorrect badge styling.

### 2. Async Contract Creation
Contracts are created by a webhook after Stripe payment completes. This is an asynchronous process that takes 1-3 seconds, so contracts don't appear immediately after redirect.

### 3. No User Feedback
After successful purchase, users were redirected to `/contractspage` without any indication that:
- Their purchase was successful
- The contract is being created
- They should wait or refresh

## Solutions Implemented

### 1. Added Missing Status Badges
**File**: `frontend/src/app/contractspage/page.tsx`

Added complete status mapping:
```typescript
const statusMap = {
  draft: { text: 'Brouillon', className: 'bg-gray-500' },
  purchased: { text: 'Acheté', className: 'bg-purple-500' },           // NEW
  pending_counterparty: { text: 'En attente', className: 'bg-yellow-500' },
  pending_acceptance: { text: 'En attente d\'acceptation', className: 'bg-blue-500' }, // NEW
  fully_signed: { text: 'Signé', className: 'bg-green-500' },
  archived: { text: 'Archivé', className: 'bg-gray-600' },             // NEW
};
```

### 2. Purchase Success Notification
Added a success banner that appears after purchase redirect:

```typescript
{purchaseSuccess && (
  <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50">
    <div className="bg-green-500 text-white px-6 py-4 rounded-lg">
      <p className="font-bold">Achat réussi!</p>
      <p>Votre contrat apparaîtra ci-dessous dans quelques secondes...</p>
    </div>
  </div>
)}
```

### 3. Auto-Refresh After Purchase
Implemented automatic contract refresh at two intervals:
- **2 seconds** after redirect (catches fast webhooks)
- **5 seconds** after redirect (catches slower webhooks)

```typescript
if (urlParams.get('purchase') === 'success') {
  // Refresh after 2 seconds
  setTimeout(() => fetchContracts(), 2000);
  // Refresh again after 5 seconds
  setTimeout(() => fetchContracts(), 5000);
}
```

### 4. Manual Refresh Button
Added a refresh button to allow users to manually reload contracts:

```tsx
<button onClick={() => fetchContracts()}>
  🔄 Actualiser
</button>
```

### 5. Updated Interface
Fixed the Contract interface to properly handle nullable counterparty:

```typescript
interface Contract {
  counterparty_id: number | null; // Can be null for purchased templates
  status: string; // Added documentation for valid statuses
  // ... other fields
}
```

## Testing the Fix

### Test Flow:
1. **Purchase a Template**
   - Go to marketplace
   - Click "Acheter" on any template
   - Complete payment (or use mock checkout)

2. **Verify Success Banner**
   - Should see green success banner at top of page
   - Banner should say "Achat réussi!"

3. **Wait for Contract to Appear**
   - Contract should appear in "Contrats créés par moi" section within 2-5 seconds
   - Status badge should show "Acheté" in purple
   - If not appearing, click "Actualiser" button

4. **Verify Contract Details**
   - Click on the purchased contract
   - Should see:
     - `status: 'purchased'`
     - `counterparty_id: null`
     - `initiator_agreed: false`
     - Purple "Acheté" badge
     - Invitation UI to assign counterparty

## Files Modified

1. **frontend/src/app/contractspage/page.tsx**
   - Added `purchaseSuccess` state
   - Added purchase success detection
   - Added auto-refresh logic
   - Added success banner
   - Added refresh button
   - Updated status badge mapping
   - Updated Contract interface

## Database Changes

No database changes needed for this fix. The contract creation logic was already correct; the issue was purely frontend UX.

## Related Documentation

See also:
- [CONTRACT_STATE_FLOW.md](CONTRACT_STATE_FLOW.md) - Complete state flow documentation
- [fix_contract_agreement_flow.sql](backend_nest/fix_contract_agreement_flow.sql) - Database migration

## Webhook Flow (For Reference)

```
User purchases → Stripe Checkout → Payment Success
                                         ↓
                              Stripe sends webhook
                                         ↓
                         Backend receives webhook
                                         ↓
                    createContractFromTemplate()
                                         ↓
                         Contract saved to DB
                                         ↓
                    User's page auto-refreshes
                                         ↓
                       Contract appears in list
```

**Timing**: Typically 1-3 seconds from payment to contract appearance.

## Future Improvements

Consider implementing:
1. **WebSocket/Server-Sent Events**: Real-time contract updates without polling
2. **Optimistic UI**: Show "Creating contract..." placeholder immediately
3. **Retry Logic**: Automatic retry if contract not found after 10 seconds
4. **Purchase History**: Separate page showing all purchases with status
5. **Email Notification**: Send email when contract is ready
