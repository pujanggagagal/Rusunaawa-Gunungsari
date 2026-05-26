import { supabase } from './supabaseClient';
import { Resident, Coordinator, BillingRecord, FinancialLog } from './types';

export const supabaseService = {
  // Residents
  async fetchResidents(): Promise<Resident[]> {
    const { data, error } = await supabase.from('residents').select('*');
    if (error) {
      console.error('Error fetching residents:', error);
      return [];
    }
    return data as Resident[];
  },
  async upsertResident(resident: Resident): Promise<boolean> {
    const { error } = await supabase.from('residents').upsert([resident]);
    if (error) console.error('Error upserting resident:', error);
    return !error;
  },
  async deleteResident(id: string): Promise<boolean> {
    const { error } = await supabase.from('residents').delete().eq('id', id);
    if (error) console.error('Error deleting resident:', error);
    return !error;
  },
  async bulkInsertResidents(residents: Resident[]): Promise<boolean> {
    const { error } = await supabase.from('residents').insert(residents);
    if (error) console.error('Error bulk inserting residents:', error);
    return !error;
  },

  // Coordinators
  async fetchCoordinators(): Promise<Coordinator[]> {
    const { data, error } = await supabase.from('coordinators').select('*');
    if (error) {
      console.error('Error fetching coordinators:', error);
      return [];
    }
    return data as Coordinator[];
  },
  async upsertCoordinator(coordinator: Coordinator): Promise<boolean> {
    const { error } = await supabase.from('coordinators').upsert([coordinator]);
    if (error) console.error('Error upserting coordinator:', error);
    return !error;
  },
  async bulkInsertCoordinators(coordinators: Coordinator[]): Promise<boolean> {
    const { error } = await supabase.from('coordinators').insert(coordinators);
    if (error) console.error('Error bulk inserting coordinators:', error);
    return !error;
  },

  // Billing Records
  async fetchBillingRecords(): Promise<BillingRecord[]> {
    const { data, error } = await supabase.from('billing_records').select('*');
    if (error) {
      console.error('Error fetching billing records:', error);
      return [];
    }
    return data as BillingRecord[];
  },
  async upsertBillingRecord(record: BillingRecord): Promise<boolean> {
    const { error } = await supabase.from('billing_records').upsert([record]);
    if (error) console.error('Error upserting billing record:', error);
    return !error;
  },
  async bulkInsertBillingRecords(records: BillingRecord[]): Promise<boolean> {
    const { error } = await supabase.from('billing_records').insert(records);
    if (error) console.error('Error bulk inserting billing records:', error);
    return !error;
  },

  // Financial Logs
  async fetchFinancialLogs(): Promise<FinancialLog[]> {
    const { data, error } = await supabase.from('financial_logs').select('*');
    if (error) {
      console.error('Error fetching financial logs:', error);
      return [];
    }
    return data as FinancialLog[];
  },
  async insertFinancialLog(log: FinancialLog): Promise<boolean> {
    const { error } = await supabase.from('financial_logs').insert([log]);
    if (error) console.error('Error inserting financial log:', error);
    return !error;
  },
  async bulkInsertFinancialLogs(logs: FinancialLog[]): Promise<boolean> {
    const { error } = await supabase.from('financial_logs').insert(logs);
    if (error) console.error('Error bulk inserting financial logs:', error);
    return !error;
  }
};
