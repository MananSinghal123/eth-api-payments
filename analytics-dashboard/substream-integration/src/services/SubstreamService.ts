import axios from 'axios';
import { SubstreamConfig } from '../config/substream';
import { PaymentData } from '../types/payment';

export class SubstreamService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = SubstreamConfig.apiUrl; // Set the API URL from the configuration
  }

  // Method to fetch data from the substream API
  public async fetchData(endpoint: string): Promise<any> {
    try {
      const response = await axios.get(`${this.apiUrl}/${endpoint}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching data from substream API:', error);
      throw error;
    }
  }

  // Method to process incoming events
  public processEvent(event: any): void {
    // Logic to process the event
    console.log('Processing event:', event);
    // Additional processing logic can be added here
  }

  // Method to manage subscriptions to the substream API
  public subscribeToEvents(eventType: string, callback: (data: any) => void): void {
    // Logic to subscribe to events
    console.log(`Subscribed to ${eventType} events.`);
    // Simulated event subscription logic
    // In a real implementation, this would connect to the substream API
  }

  // Example method to fetch payment data
  public async getPaymentData(paymentId: string): Promise<PaymentData> {
    const data = await this.fetchData(`payments/${paymentId}`);
    return data as PaymentData; // Cast the response to the PaymentData type
  }
}