import { useCallback } from 'react';
import * as XLSX from 'xlsx';

export const useExcelExport = () => {
  const exportToExcel = useCallback((data: any[], filename: string) => {
    if (!data || data.length === 0) {
      alert('No data to export');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
  }, []);

  const exportToExcelMultiSheet = useCallback((sheets: Record<string, any[]>, filename: string) => {
    const wb = XLSX.utils.book_new();
    
    Object.entries(sheets).forEach(([sheetName, data]) => {
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
  }, []);

  return { exportToExcel, exportToExcelMultiSheet };
};
