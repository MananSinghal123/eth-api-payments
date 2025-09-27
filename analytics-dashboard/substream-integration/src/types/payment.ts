export interface Payment {
  id: string; // Unique identifier for the payment
  userId: string; // Identifier for the user making the payment
  amount: number; // Amount of the payment in the smallest currency unit (e.g., cents)
  currency: string; // Currency code (e.g., 'ETH', 'USD')
  timestamp: Date; // Date and time when the payment was made
  status: 'pending' | 'completed' | 'failed'; // Current status of the payment
}

export interface PaymentEvent {
  payment: Payment; // The payment object associated with the event
  eventType: 'created' | 'updated' | 'deleted'; // Type of event related to the payment
  occurredAt: Date; // Date and time when the event occurred
}