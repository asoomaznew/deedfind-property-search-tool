import React, { useState, FormEvent, useEffect, ChangeEvent } from 'react';
import { Input } from './components/ui/Input';
import { Button } from './components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/Table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/Select';
import { Label } from './components/ui/Label';
import { Separator } from './components/ui/Separator';
import { Search, UploadCloud } from 'lucide-react';
import * as XLSX from 'xlsx';

import { deedData, generalSearchFields } from './data/deed-data';
import { DeedEntry, SearchType, TableViewType } from './types';

const getDeedEntryKey = (entry: DeedEntry): string => {
  const keyParts = [
    entry.municipalityTitleDeed,
    entry.hajryPlotNumber,
    entry.mazaya,
    entry.title,
    entry.referenceDeed,
    entry.buildingNo,
  ];
  return keyParts.map(part => part ?? 'null').join('|');
};

const deduplicateDeedEntries = (entries: DeedEntry[]): DeedEntry[] => {
  const uniqueEntriesMap = new Map<string, DeedEntry>();
  for (const entry of entries) {
    const key = getDeedEntryKey(entry);
    if (!uniqueEntriesMap.has(key)) {
      uniqueEntriesMap.set(key, entry);
    }
  }
  return Array.from(uniqueEntriesMap.values());
};

export default function App() {
  const [hajryInput, setHajryInput] = useState('');
  const [buildingNoInput, setBuildingNoInput] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('hajryOnly');
  const [searchResults, setSearchResults] = useState<DeedEntry[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [searchedTerm, setSearchedTerm] = useState('');
  const [searchedBuildingNoTerm, setSearchedBuildingNoTerm] = useState('');
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const [showFullTable, setShowFullTable] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [excelData, setExcelData] = useState<any[][] | null>(null);
  const [excelHeaders, setExcelHeaders] = useState<string[] | null>(null);
  const [selectedExcelColumn1, setSelectedExcelColumn1] = useState<string | null>(null);
  const [selectedExcelColumn2, setSelectedExcelColumn2] = useState<string | null>(null);
  const [selectedExcelColumn3, setSelectedExcelColumn3] = useState<string | null>(null);
  const [isProcessingExcel, setIsProcessingExcel] = useState(false);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  const resetExcelState = () => {
    setFile(null);
    setExcelData(null);
    setExcelHeaders(null);
    setSelectedExcelColumn1(null);
    setSelectedExcelColumn2(null);
    setSelectedExcelColumn3(null);
    setIsProcessingExcel(false);
    const fileInput = document.getElementById('excelFile') as HTMLInputElement;
    if (fileInput) {
        fileInput.value = '';
    }
  };

  const handleSearchTypeChange = (value: SearchType) => {
    setSearchType(value);
    setHajryInput('');
    setBuildingNoInput('');
    setSearchResults([]);
    setNotFound(false);
    setSearchedTerm('');
    setSearchedBuildingNoTerm('');
    resetExcelState();
  };

  const getInputLabel = () => {
    switch (searchType) {
      case 'hajryOnly': return 'General Search Term';
      case 'hajryAndBuilding': return 'Hajry Details';
      case 'mazayaSearch': return 'Mazaya (Source Column) Value';
      default: return 'Search Term';
    }
  };

  const getInputPlaceholder = () => {
    switch (searchType) {
      case 'hajryOnly': return 'e.g., 108, SH(A3-01), A3';
      case 'hajryAndBuilding': return 'e.g., SH(A3-01), 108';
      case 'mazayaSearch': return 'e.g., 108, 104';
      default: return 'Enter search term';
    }
  };

  const performSingleSearch = (searchTerm: string, buildingNoTerm?: string): DeedEntry[] => {
    if (!searchTerm && !buildingNoTerm) return [];

    return deedData.filter(entry => {
      if (searchType === 'hajryOnly') {
        return generalSearchFields.some(field => {
          const value = entry[field];
          return value && value.toString().toLowerCase().includes(searchTerm.toLowerCase());
        });
      } else if (searchType === 'hajryAndBuilding') {
        const hajryMatch = searchTerm ? generalSearchFields.some(field => {
          const value = entry[field];
          return value && value.toString().toLowerCase().includes(searchTerm.toLowerCase());
        }) : true;
        
        const buildingMatch = buildingNoTerm ? (
          entry.buildingNo && entry.buildingNo.toString().toLowerCase().includes(buildingNoTerm.toLowerCase())
        ) : true;
        
        return hajryMatch && buildingMatch;
      } else if (searchType === 'mazayaSearch') {
        return entry.title && entry.title.toString().toLowerCase().includes(searchTerm.toLowerCase());
      }
      return false;
    });
  };

  const handleSearch = (event?: FormEvent) => {
    if (event) event.preventDefault();
    if (searchType === 'excelFile' || showFullTable) return;
    resetExcelState();

    const currentSearchTerm = hajryInput.trim();
    const currentBuildingNoTerm = buildingNoInput.trim();

    if ((searchType === 'hajryOnly' || searchType === 'mazayaSearch') && !currentSearchTerm) {
      setSearchResults([]); setNotFound(false); setSearchedTerm(''); setSearchedBuildingNoTerm(''); return;
    }
    if (searchType === 'hajryAndBuilding' && !currentSearchTerm && !currentBuildingNoTerm) {
      setSearchResults([]); setNotFound(false); setSearchedTerm(''); setSearchedBuildingNoTerm(''); return;
    }

    setSearchedTerm(currentSearchTerm);
    setSearchedBuildingNoTerm(currentBuildingNoTerm);

    const rawResults = performSingleSearch(currentSearchTerm, currentBuildingNoTerm);
    const uniqueResults = deduplicateDeedEntries(rawResults);

    setSearchResults(uniqueResults);
    setNotFound(uniqueResults.length === 0 && (currentSearchTerm !== '' || (searchType === 'hajryAndBuilding' && currentBuildingNoTerm !== '')));
  };

  const clearSearchResults = () => {
    if (searchResults.length > 0 || notFound || file) {
      setSearchResults([]);
      setNotFound(false);
      setSearchedTerm('');
      setSearchedBuildingNoTerm('');
      if (!isProcessingExcel && file) {
        resetExcelState();
      }
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result;
        if (data) {
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

          setExcelHeaders(jsonData.length > 0 ? (jsonData[0] as string[]) : null);
          setExcelData(jsonData.length > 0 ? jsonData.slice(1) : null);
          setSelectedExcelColumn1(null);
          setSelectedExcelColumn2(null);
          setSelectedExcelColumn3(null);
          setSearchResults([]);
          setNotFound(false);
        }
      };
      reader.readAsArrayBuffer(selectedFile);
    }
  };

  const handleExcelSearch = () => {
    if (!excelData || !excelHeaders || (!selectedExcelColumn1 && !selectedExcelColumn2 && !selectedExcelColumn3)) {
      setSearchResults([]);
      setNotFound(true);
      setSearchedTerm('Excel Upload');
      return;
    }

    setIsProcessingExcel(true);
    const allResultsMap = new Map<string, DeedEntry>();

    excelData.forEach(row => {
      [selectedExcelColumn1, selectedExcelColumn2, selectedExcelColumn3].forEach(selectedColumn => {
        if (selectedColumn) {
          const columnIndex = excelHeaders.indexOf(selectedColumn);
          if (columnIndex !== -1 && row[columnIndex]) {
            const searchValue = row[columnIndex].toString().trim();
            if (searchValue) {
              const results = performSingleSearch(searchValue);
              results.forEach(result => {
                const key = getDeedEntryKey(result);
                allResultsMap.set(key, result);
              });
            }
          }
        }
      });
    });

    const aggregatedResults = Array.from(allResultsMap.values());
    setSearchResults(aggregatedResults);
    setNotFound(aggregatedResults.length === 0);
    setSearchedTerm('Excel Upload');
    setSearchedBuildingNoTerm('');
    setIsProcessingExcel(false);
  };

  const handleTableViewChange = (value: TableViewType) => {
    const isFullView = value === 'full';
    setShowFullTable(isFullView);

    if (isFullView) {
      setSearchResults(deduplicateDeedEntries(deedData));
      setNotFound(false);
      setHajryInput('');
      setBuildingNoInput('');
      setSearchedTerm('');
      setSearchedBuildingNoTerm('');
      resetExcelState();
    } else {
      setSearchResults([]);
      setNotFound(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Professional Header */}
      <header className="bg-gradient-primary shadow-professional border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mr-4">
                <Search className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
                DeedFind
              </h1>
            </div>
            <p className="text-white/90 text-lg sm:text-xl font-medium max-w-2xl mx-auto">
              Professional Property Search & Municipality Title Deed Information System
            </p>
            <div className="mt-4 flex items-center justify-center space-x-6 text-white/80 text-sm">
              <span className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                194 Properties Indexed
              </span>
              <span className="flex items-center">
                <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                Real-time Search
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
        {/* Professional Search Card */}
        <Card className="shadow-professional border-0 bg-card/50 backdrop-blur-sm animate-slide-up">
          <CardHeader className="pb-6">
            <div className="text-center space-y-2">
              <CardTitle className="text-2xl font-semibold text-foreground">
                Advanced Property Search
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                Search through municipality records, title deeds, and property information
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            <form onSubmit={handleSearch} className="space-y-8">
              {/* Search Configuration */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="searchTypeSelect" className="text-sm font-medium text-foreground">
                    Search Method
                  </Label>
                  <Select value={searchType} onValueChange={(value) => handleSearchTypeChange(value as SearchType)}>
                    <SelectTrigger id="searchTypeSelect" className="h-11 bg-background border-border hover:border-primary/50 transition-colors">
                      <SelectValue placeholder="Choose search method" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="hajryOnly" className="hover:bg-accent">General Search</SelectItem>
                      <SelectItem value="hajryAndBuilding" className="hover:bg-accent">Combined Search</SelectItem>
                      <SelectItem value="mazayaSearch" className="hover:bg-accent">Mazaya Search</SelectItem>
                      <SelectItem value="excelFile" className="hover:bg-accent">Excel Upload</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tableViewSelect" className="text-sm font-medium text-foreground">
                    Display Mode
                  </Label>
                  <Select
                    value={showFullTable ? 'full' : 'compact'}
                    onValueChange={(value) => handleTableViewChange(value as TableViewType)}
                  >
                    <SelectTrigger id="tableViewSelect" className="h-11 bg-background border-border hover:border-primary/50 transition-colors">
                      <SelectValue placeholder="Choose display mode" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="compact" className="hover:bg-accent">Search Mode</SelectItem>
                      <SelectItem value="full" className="hover:bg-accent">View All Records</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
