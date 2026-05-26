import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False

i = 0
while i < len(lines):
    line = lines[i]
    
    # 1. Remove google imports
    if "import {" in line and "from './googleSheetsClient';" in lines[i+8]:
        i += 9
        continue
    if "import { User as FirebaseUser } from 'firebase/auth';" in line:
        i += 1
        continue
    if "import { supabase } from './supabaseClient';" in line:
        new_lines.append(line)
        new_lines.append("import { supabaseService } from './supabaseService';\n")
        i += 1
        continue
    
    # 2. Add isLoading state
    if "const [data, setData] = useState(() => getStoredData());" in line:
        new_lines.append("  const [data, setData] = useState(() => getStoredData());\n")
        new_lines.append("  const [isLoading, setIsLoading] = useState(true);\n")
        i += 1
        continue
        
    # 3. Skip Google states
    if "// Google Sheets Integration States" in line:
        while "// Save changes locally to localStorage" not in lines[i]:
            i += 1
        continue
        
    # 4. Replace Save locally with Load Supabase
    if "// Save changes locally to localStorage" in line:
        # skip until "  // Handle login success"
        while "  // Handle login success" not in lines[i]:
            i += 1
            
        supabase_effect = """
  // Load Data from Supabase
  useEffect(() => {
    const loadSupabaseData = async () => {
      try {
        const residentsData = await supabaseService.fetchResidents();
        const coordinatorsData = await supabaseService.fetchCoordinators();
        const billingData = await supabaseService.fetchBillingRecords();
        const financeData = await supabaseService.fetchFinancialLogs();

        // Migrate local data if supabase is completely empty
        if (residentsData.length === 0 && coordinatorsData.length === 0) {
           const { getStoredData } = await import('./data');
           const localData = getStoredData();
           if (localData.residents.length > 0) {
             await supabaseService.bulkInsertResidents(localData.residents);
             await supabaseService.bulkInsertCoordinators(localData.coordinators);
             await supabaseService.bulkInsertBillingRecords(localData.billing);
             await supabaseService.bulkInsertFinancialLogs(localData.finance);
             
             setData(localData);
           }
        } else {
          setData(prev => ({
            ...prev,
            residents: residentsData,
            coordinators: coordinatorsData,
            billing: billingData,
            finance: financeData
          }));
        }
      } catch (err) {
        console.error('Error loading Supabase data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadSupabaseData();
  }, []);
"""
        new_lines.append(supabase_effect)
        continue

    # 5. Strip syncTable
    if "syncTable(" in line or "AutoSync asynchronously to Google Sheets" in line:
        i += 1
        continue
        
    # 6. Skip Google Sheets UI Banner
    if "{/* Google Sheets Connection Status Hub Banner */}" in line:
        while "            <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6\">" not in lines[i]:
            i += 1
        continue
        
    # 7. Remove unused lucide icons
    if "DatabaseZap," in line or "ClipboardCheck," in line or "FileSpreadsheet," in line or "UploadCloud" in line or "RefreshCw," in line:
        # just replace them
        line = line.replace("DatabaseZap,", "").replace("ClipboardCheck,", "").replace("FileSpreadsheet,", "").replace("UploadCloud", "").replace("RefreshCw,", "")
        
    new_lines.append(line)
    i += 1

# write back
with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
print("Done")
