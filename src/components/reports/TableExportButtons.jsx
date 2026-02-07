import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function TableExportButtons({ data, headers, title, onExportCSV }) {
  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text(title, 14, 15);
    
    // Add date
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 22);
    
    // Add table
    doc.autoTable({
      head: [headers],
      body: data,
      startY: 28,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    });
    
    doc.save(`${title.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="flex gap-2">
      {onExportCSV && (
        <Button variant="outline" size="sm" onClick={onExportCSV}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      )}
      <Button variant="outline" size="sm" onClick={handleExportPDF}>
        <FileText className="w-4 h-4 mr-2" />
        Export PDF
      </Button>
    </div>
  );
}