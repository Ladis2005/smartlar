export interface PurchaseGuardInput {
  /** true quando o servidor reservou o evento para esta encomenda (primeira vez). */
  dbClaimed: boolean;
  /** true quando este navegador já registou o Purchase desta encomenda. */
  alreadyMarkedLocally: boolean;
}

/** O Purchase só dispara quando as duas verificações concordam que é a primeira vez. */
export function shouldFirePurchase({ dbClaimed, alreadyMarkedLocally }: PurchaseGuardInput): boolean {
  if (alreadyMarkedLocally) return false;
  return dbClaimed;
}
