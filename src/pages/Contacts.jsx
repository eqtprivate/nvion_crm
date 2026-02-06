import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, UserCircle, MoreVertical, Download, Scan } from 'lucide-react';
import ContactDialog from '../components/forms/ContactDialog';
import EditContactDialog from '../components/forms/EditContactDialog';
import BusinessCardScanner from '../components/forms/BusinessCardScanner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

export default function Contacts() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [scannedData, setScannedData] = useState(null);
  const queryClient = useQueryClient();

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => base44.entities.Contact.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Contact.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      setDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Contact.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      setEditDialogOpen(false);
      setSelectedContact(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Contact.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  const handleEdit = (contact) => {
    setSelectedContact(contact);
    setEditDialogOpen(true);
  };

  const handleViewDetails = (contact) => {
    setSelectedContact(contact);
    setViewDialogOpen(true);
  };

  const handleContactExtracted = (data) => {
    setScannedData(data);
    setDialogOpen(true);
  };

  const exportToCSV = () => {
    if (contacts.length === 0) return;
    
    const headers = ['Name', 'Email', 'Phone', 'Company', 'Position', 'Status', 'Source'];
    const rows = contacts.map(contact => [
      contact.name || '',
      contact.email || '',
      contact.phone || '',
      contact.company || '',
      contact.position || '',
      contact.status || '',
      contact.source || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contacts_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredContacts = contacts.filter(contact =>
    contact.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-500 mt-1">Manage your contacts</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={exportToCSV} disabled={contacts.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => setScannerOpen(true)}>
            <Scan className="w-4 h-4 mr-2" />
            Scan Card
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => { setScannedData(null); setDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            New Contact
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredContacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  No contacts found
                </TableCell>
              </TableRow>
            ) : (
              filteredContacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <UserCircle className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{contact.name}</p>
                        <p className="text-sm text-gray-500">{contact.position}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{contact.email}</TableCell>
                  <TableCell>{contact.phone || '-'}</TableCell>
                  <TableCell>{contact.company || '-'}</TableCell>
                  <TableCell>
                    {contact.source ? (
                      <Badge variant="outline">{contact.source}</Badge>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        contact.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }
                    >
                      {contact.status || 'active'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(contact)}>Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleViewDetails(contact)}>View Details</DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => deleteMutation.mutate(contact.id)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ContactDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setScannedData(null);
        }}
        onSubmit={(data) => {
          createMutation.mutate(data);
          setScannedData(null);
        }}
        isLoading={createMutation.isPending}
        initialData={scannedData}
      />

      <EditContactDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        contact={selectedContact}
        onSubmit={(data) => updateMutation.mutate({ id: selectedContact.id, data })}
        isLoading={updateMutation.isPending}
      />

      <EditContactDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        contact={selectedContact}
        onSubmit={() => {}}
        isLoading={false}
        readOnly={true}
      />

      <BusinessCardScanner
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onContactExtracted={handleContactExtracted}
      />
    </div>
  );
}