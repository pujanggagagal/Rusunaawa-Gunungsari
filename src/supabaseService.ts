import { supabase } from './supabaseClient';
import { Resident, Coordinator, BillingRecord, FinancialLog } from './types';

// Helper mappers to map camelCase types to physical lowercase database schema
const mapResidentToDb = (r: any) => ({
  id: r.id,
  name: r.name,
  ktp: r.ktp,
  unit: r.unit,
  block: r.block,
  floor: r.floor,
  phone: r.phone,
  electricitystatus: r.electricityStatus,
  laststatuschange: r.lastStatusChange,
  occupancystatus: r.occupancyStatus,
  initialmeter: r.initialMeter,
  isvacant: r.isVacant
});

const mapCoordinatorToDb = (c: any) => ({
  id: c.id,
  name: c.name,
  ktp: c.ktp,
  assignedfloor: c.assignedFloor,
  assignedblock: c.assignedBlock
});

const mapBillingToDb = (b: any) => ({
  id: b.id,
  residentktp: b.residentKtp,
  month: b.month,
  year: b.year,
  prevmeter: b.prevMeter,
  currentmeter: b.currentMeter,
  usage: b.usage,
  pdambill: b.pdamBill,
  trashbill: b.trashBill,
  totalbill: b.totalBill,
  status: b.status,
  paymentdate: b.paymentDate
});

const mapFinanceToDb = (f: any) => ({
  id: f.id,
  type: f.type,
  amount: f.amount,
  description: f.description,
  date: f.date,
  category: f.category,
  funduser: f.fundUser
});

export const supabaseService = {
  // Residents
  async fetchResidents(): Promise<Resident[]> {
    const { data, error } = await supabase.from('residents').select('*');
    if (error) {
      console.error('Error fetching residents:', error);
      return [];
    }
    return data as any[];
  },
  async upsertResident(resident: Resident): Promise<boolean> {
    const { error } = await supabase.from('residents').upsert([mapResidentToDb(resident)]);
    if (error) console.error('Error upserting resident:', error);
    return !error;
  },
  async deleteResident(id: string): Promise<boolean> {
    const { error } = await supabase.from('residents').delete().eq('id', id);
    if (error) console.error('Error deleting resident:', error);
    return !error;
  },
  async bulkInsertResidents(residents: Resident[]): Promise<boolean> {
    const mapped = residents.map(mapResidentToDb);
    const { error } = await supabase.from('residents').upsert(mapped);
    if (error) console.error('Error bulk upserting residents:', error);
    return !error;
  },

  // Coordinators
  async fetchCoordinators(): Promise<Coordinator[]> {
    const { data, error } = await supabase.from('coordinators').select('*');
    if (error) {
      console.error('Error fetching coordinators:', error);
      return [];
    }
    return data as any[];
  },
  async upsertCoordinator(coordinator: Coordinator): Promise<boolean> {
    const { error } = await supabase.from('coordinators').upsert([mapCoordinatorToDb(coordinator)]);
    if (error) console.error('Error upserting coordinator:', error);
    return !error;
  },
  async bulkInsertCoordinators(coordinators: Coordinator[]): Promise<boolean> {
    const mapped = coordinators.map(mapCoordinatorToDb);
    const { error } = await supabase.from('coordinators').upsert(mapped);
    if (error) console.error('Error bulk upserting coordinators:', error);
    return !error;
  },

  // Billing Records
  async fetchBillingRecords(): Promise<BillingRecord[]> {
    const { data, error } = await supabase.from('billing').select('*');
    if (error) {
      console.error('Error fetching billing records:', error);
      return [];
    }
    return data as any[];
  },
  async upsertBillingRecord(record: BillingRecord): Promise<boolean> {
    const { error } = await supabase.from('billing').upsert([mapBillingToDb(record)]);
    if (error) console.error('Error upserting billing record:', error);
    return !error;
  },
  async bulkInsertBillingRecords(records: BillingRecord[]): Promise<boolean> {
    const mapped = records.map(mapBillingToDb);
    const { error } = await supabase.from('billing').upsert(mapped);
    if (error) console.error('Error bulk upserting billing records:', error);
    return !error;
  },

  // Financial Logs
  async fetchFinancialLogs(): Promise<FinancialLog[]> {
    const { data, error } = await supabase.from('finance_logs').select('*');
    if (error) {
      console.error('Error fetching financial logs:', error);
      return [];
    }
    return data as any[];
  },
  async insertFinancialLog(log: FinancialLog): Promise<boolean> {
    const { error } = await supabase.from('finance_logs').upsert([mapFinanceToDb(log)]);
    if (error) console.error('Error inserting financial log:', error);
    return !error;
  },
  async bulkInsertFinancialLogs(logs: FinancialLog[]): Promise<boolean> {
    const mapped = logs.map(mapFinanceToDb);
    const { error } = await supabase.from('finance_logs').upsert(mapped);
    if (error) console.error('Error bulk upserting financial logs:', error);
    return !error;
  },
};
