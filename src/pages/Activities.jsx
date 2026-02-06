import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Phone, Mail, Calendar as CalendarIcon, FileText, MessageSquare } from 'lucide-react';
import ActivityDialog from '../components/forms/ActivityDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function Activities() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['activities'],
    queryFn: () => base44.entities.Activity.list('-date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Activity.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Activity.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });

  const filteredActivities = activities.filter(activity =>
    activity.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    activity.related_to_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activityIcons = {
    Call: Phone,
    Email: Mail,
    Meeting: CalendarIcon,
    Task: FileText,
    Note: MessageSquare,
  };

  const activityColors = {
    Call: 'bg-blue-100 text-blue-800',
    Email: 'bg-purple-100 text-purple-800',
    Meeting: 'bg-green-100 text-green-800',
    Task: 'bg-orange-100 text-orange-800',
    Note: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Activities</h1>
          <p className="text-gray-500 mt-1">Track your sales activities</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Log Activity
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search activities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          Loading activities...
        </div>
      ) : filteredActivities.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">No activities found. Start logging your activities!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredActivities.map((activity) => {
            const Icon = activityIcons[activity.type] || FileText;
            return (
              <Card key={activity.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge className={activityColors[activity.type]}>
                            {activity.type}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {format(new Date(activity.date), 'MMM d, yyyy h:mm a')}
                          </span>
                        </div>
                        <p className="text-gray-900 mb-2">{activity.description}</p>
                        {activity.related_to_name && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="font-medium">Related to:</span>
                            <Badge variant="outline">
                              {activity.related_to_type}: {activity.related_to_name}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => deleteMutation.mutate(activity.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ActivityDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
      />
    </div>
  );
}