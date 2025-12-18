import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { Download, Loader2, Database, Copy, Check } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

const ENTITIES = [
  { name: 'Job', label: 'Jobs' },
  { name: 'Customer', label: 'Customers' },
  { name: 'Assignment', label: 'Assignments' },
  { name: 'DeliveryType', label: 'Delivery Types' },
  { name: 'PickupLocation', label: 'Pickup Locations' },
  { name: 'Placeholder', label: 'Placeholders' },
  { name: 'Message', label: 'Messages' },
  { name: 'Notification', label: 'Notifications' },
  { name: 'NotificationReadStatus', label: 'Notification Read Status' },
  { name: 'LocationUpdate', label: 'Location Updates' },
  { name: 'User', label: 'Users' },
];

function escapeSQL(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

function toSnakeCase(str) {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

function generateCreateTable(entityName, records) {
  if (!records || records.length === 0) return '';
  
  const tableName = toSnakeCase(entityName);
  const sampleRecord = records[0];
  const columns = [];
  
  for (const [key, value] of Object.entries(sampleRecord)) {
    const colName = toSnakeCase(key);
    let colType = 'TEXT';
    
    if (key === 'id') {
      colType = 'UUID PRIMARY KEY';
    } else if (key.endsWith('_date') || key === 'created_date' || key === 'updated_date' || key === 'timestamp') {
      colType = 'TIMESTAMPTZ';
    } else if (typeof value === 'boolean') {
      colType = 'BOOLEAN DEFAULT FALSE';
    } else if (typeof value === 'number') {
      colType = Number.isInteger(value) ? 'INTEGER' : 'NUMERIC';
    } else if (Array.isArray(value) || typeof value === 'object') {
      colType = 'JSONB';
    }
    
    columns.push(`  ${colName} ${colType}`);
  }
  
  return `-- Create table for ${entityName}\nCREATE TABLE IF NOT EXISTS ${tableName} (\n${columns.join(',\n')}\n);\n\n`;
}

function generateInsertStatements(entityName, records) {
  if (!records || records.length === 0) return '';
  
  const tableName = toSnakeCase(entityName);
  const statements = [];
  
  for (const record of records) {
    const columns = [];
    const values = [];
    
    for (const [key, value] of Object.entries(record)) {
      columns.push(toSnakeCase(key));
      
      if (key === 'id' && typeof value === 'string') {
        if (value.length === 36 && value.includes('-')) {
          values.push(`'${value}'`);
        } else {
          values.push(`uuid_generate_v5(uuid_ns_url(), '${value}')`);
        }
      } else if ((key === 'created_date' || key === 'updated_date' || key.endsWith('Date') || key === 'timestamp') && value) {
        values.push(`'${new Date(value).toISOString()}'::timestamptz`);
      } else {
        values.push(escapeSQL(value));
      }
    }
    
    statements.push(`INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});`);
  }
  
  return `-- Insert data for ${entityName} (${records.length} records)\n${statements.join('\n')}\n\n`;
}

export default function DataExport() {
  const [selectedEntities, setSelectedEntities] = useState(ENTITIES.map(e => e.name));
  const [loading, setLoading] = useState(false);
  const [sqlOutput, setSqlOutput] = useState('');
  const [copied, setCopied] = useState(false);
  const [includeCreateTable, setIncludeCreateTable] = useState(true);
  const { toast } = useToast();

  const handleToggleEntity = (entityName) => {
    setSelectedEntities(prev => 
      prev.includes(entityName) 
        ? prev.filter(e => e !== entityName)
        : [...prev, entityName]
    );
  };

  const handleSelectAll = () => {
    setSelectedEntities(ENTITIES.map(e => e.name));
  };

  const handleSelectNone = () => {
    setSelectedEntities([]);
  };

  const handleExport = async () => {
    if (selectedEntities.length === 0) {
      toast({
        title: "No Entities Selected",
        description: "Please select at least one entity to export.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setSqlOutput('');

    try {
      let sql = `-- Base44 Data Export to PostgreSQL\n`;
      sql += `-- Generated: ${new Date().toISOString()}\n`;
      sql += `-- Entities: ${selectedEntities.join(', ')}\n\n`;
      sql += `-- Enable UUID extension if not already enabled\nCREATE EXTENSION IF NOT EXISTS "uuid-ossp";\n\n`;

      for (const entityName of selectedEntities) {
        try {
          const records = await base44.entities[entityName].list();
          
          if (records && records.length > 0) {
            if (includeCreateTable) {
              sql += generateCreateTable(entityName, records);
            }
            sql += generateInsertStatements(entityName, records);
          } else {
            sql += `-- No records found for ${entityName}\n\n`;
          }
        } catch (err) {
          sql += `-- Error fetching ${entityName}: ${err.message}\n\n`;
        }
      }

      setSqlOutput(sql);
      toast({
        title: "Export Complete",
        description: `Generated SQL for ${selectedEntities.length} entities.`
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(sqlOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied to clipboard" });
  };

  const handleDownload = () => {
    const blob = new Blob([sqlOutput], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `base44_export_${new Date().toISOString().split('T')[0]}.sql`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Export Application Data</h3>
          <p className="text-sm text-gray-600">
            Export your application data as PostgreSQL-compatible SQL INSERT statements for Supabase migration.
          </p>
        </div>

        <div>
          <div className="flex gap-2 mb-4">
            <Button variant="outline" size="sm" onClick={handleSelectAll}>Select All</Button>
            <Button variant="outline" size="sm" onClick={handleSelectNone}>Select None</Button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {ENTITIES.map(entity => (
              <div key={entity.name} className="flex items-center space-x-2">
                <Checkbox
                  id={entity.name}
                  checked={selectedEntities.includes(entity.name)}
                  onCheckedChange={() => handleToggleEntity(entity.name)}
                />
                <label htmlFor={entity.name} className="text-sm font-medium cursor-pointer">
                  {entity.label}
                </label>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeCreateTable"
                checked={includeCreateTable}
                onCheckedChange={setIncludeCreateTable}
              />
              <label htmlFor="includeCreateTable" className="text-sm font-medium cursor-pointer">
                Include CREATE TABLE statements
              </label>
            </div>
          </div>

          <Button 
            onClick={handleExport} 
            disabled={loading || selectedEntities.length === 0}
            className="mt-6 w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating SQL...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                Generate SQL Export
              </>
            )}
          </Button>
        </div>

        {sqlOutput && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">SQL Output</h4>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download .sql
                </Button>
              </div>
            </div>
            <Textarea
              value={sqlOutput}
              readOnly
              className="font-mono text-xs h-96"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}