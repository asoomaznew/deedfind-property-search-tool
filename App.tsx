import React, { useState, FormEvent, useEffect, ChangeEvent } from 'react';
import { Input } from './components/ui/Input';
import { Button } from './components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/Table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/Select';
import { Label } from './components/ui/Label';
import { Separator } from './components/ui/Separator';
import { Search, UploadCloud, Download } from 'lucide-react';
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

  // Download template function
  const downloadTemplate = () => {
    // Create sample data with Hajry, Mazaya, and Building No. columns for combined search
    const templateData = [
      ['Hajry', 'Mazaya', 'Building No.', 'Description'],
      ['108', '', '1143', 'Search by Hajry + Building No.'],
      ['', '105', '1153', 'Search by Mazaya + Building No.'],
      ['211', '201', '1142', 'Search by both Hajry and Mazaya + Building No.'],
      ['210', '', '1144', 'Mixed search combinations'],
      ['209', '203', '', 'Building No. is optional'],
      ['208', '', '1145', ''],
      ['207', '301', '1151', ''],
      ['311', '', '1152', ''],
      ['310', '302', '', ''],
      ['309', '', '1143', ''],
      ['308', '304', '1153', ''],
      ['', '', '', ''],
      ['', '', '', 'INSTRUCTIONS:'],
      ['', '', '', '1. Fill Hajry column with values like: 108, 107, 211, 210, etc.'],
      ['', '', '', '2. Fill Mazaya column with values like: 101, 102, 103, 104, 105, 201, 202, etc.'],
      ['', '', '', '3. Fill Building No. column with values like: 1143, 1144, 1145, 1142, 1153, etc.'],
      ['', '', '', '4. COMBINED SEARCH OPTIONS:'],
      ['', '', '', '   - Hajry + Building No. (more precise results)'],
      ['', '', '', '   - Mazaya + Building No. (more precise results)'],
      ['', '', '', '   - Hajry only OR Mazaya only (broader search)'],
      ['', '', '', '5. Leave unused cells empty'],
      ['', '', '', '6. System will automatically detect and use available combinations'],
      ['', '', '', '7. Valid Mazaya values: 101-105, 201-205, 301-305 (per building)']
    ];

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(templateData);

    // Set column widths
    ws['!cols'] = [
      { width: 15 }, // Hajry
      { width: 15 }, // Mazaya
      { width: 15 }, // Building No.
      { width: 45 }  // Description
    ];

    // Style the header row
    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "4F46E5" } },
      alignment: { horizontal: "center" }
    };

    // Apply header styling
    ['A1', 'B1', 'C1', 'D1'].forEach(cell => {
      if (ws[cell]) {
        ws[cell].s = headerStyle;
      }
    });

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "DeedFind Template");

    // Generate and download file
    const fileName = `DeedFind_Template_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

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
      case 'hajrySearch': return 'Hajry Value';
      case 'hajryAndBuilding': return 'Hajry Details';
      case 'mazayaSearch': return 'Mazaya (Source Column) Value';
      default: return 'Search Term';
    }
  };

  const getInputPlaceholder = () => {
    switch (searchType) {
      case 'hajryOnly': return 'e.g., 108, SH(A3-01), A3';
      case 'hajrySearch': return 'e.g., 108, 107, 211, 210';
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
          if (!value) return false;

          const valueStr = value.toString().toLowerCase();
          const searchStr = searchTerm.toLowerCase();

          // Exact match or contains match
          return valueStr === searchStr || valueStr.includes(searchStr);
        });
      } else if (searchType === 'hajrySearch') {
        // Hajry search - search only in the mazaya field (which contains Hajry values)
        if (!entry.mazaya) return false;
        const mazayaStr = entry.mazaya.toString().toLowerCase();
        const searchStr = searchTerm.toLowerCase();
        return mazayaStr === searchStr || mazayaStr.includes(searchStr);
      } else if (searchType === 'excelFile') {
        // For Excel searches, search ONLY in mazaya field for exact matches
        // This matches your expected behavior where 108 should find entries with mazaya: '108'
        const searchStr = searchTerm.toString();

        // Only check mazaya field for exact match
        return entry.mazaya && entry.mazaya.toString() === searchStr;
      } else if (searchType === 'hajryAndBuilding') {
        const hajryMatch = searchTerm ? generalSearchFields.some(field => {
          const value = entry[field];
          if (!value) return false;

          const valueStr = value.toString().toLowerCase();
          const searchStr = searchTerm.toLowerCase();

          return valueStr === searchStr || valueStr.includes(searchStr);
        }) : true;

        const buildingMatch = buildingNoTerm ? (
          entry.buildingNo && (
            entry.buildingNo.toString().toLowerCase() === buildingNoTerm.toLowerCase() ||
            entry.buildingNo.toString().toLowerCase().includes(buildingNoTerm.toLowerCase())
          )
        ) : true;

        return hajryMatch && buildingMatch;
      } else if (searchType === 'mazayaSearch') {
        if (!entry.title) return false;
        const titleStr = entry.title.toString().toLowerCase();
        const searchStr = searchTerm.toLowerCase();
        return titleStr === searchStr || titleStr.includes(searchStr);
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

    if ((searchType === 'hajryOnly' || searchType === 'hajrySearch' || searchType === 'mazayaSearch') && !currentSearchTerm) {
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

      // Clear all previous search results and states
      setSearchResults([]);
      setNotFound(false);
      setSearchedTerm('');
      setSearchedBuildingNoTerm('');
      setExcelHeaders(null);
      setExcelData(null);
      setSelectedExcelColumn1(null);
      setSelectedExcelColumn2(null);
      setSelectedExcelColumn3(null);
      setIsProcessingExcel(false);

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (data) {
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

            console.log('Excel file loaded:', {
              sheetName,
              totalRows: jsonData.length,
              headers: jsonData[0],
              sampleData: jsonData.slice(1, 3)
            });

            if (jsonData.length > 0) {
              const headers = jsonData[0] as string[];
              const dataRows = jsonData.slice(1);

              setExcelHeaders(headers);
              setExcelData(dataRows);
              setSelectedExcelColumn1(null);
              setSelectedExcelColumn2(null);
              setSelectedExcelColumn3(null);
            } else {
              console.error('Excel file is empty');
              setExcelHeaders(null);
              setExcelData(null);
            }
          }
        } catch (error) {
          console.error('Error reading Excel file:', error);
          setExcelHeaders(null);
          setExcelData(null);
          setNotFound(true);
          setSearchedTerm('Excel Upload Error');
        }
      };

      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        setNotFound(true);
        setSearchedTerm('Excel Upload Error');
      };

      reader.readAsArrayBuffer(selectedFile);
    }
  };

  const handleExcelSearch = () => {
    console.log('Starting Excel search...', {
      excelData: excelData?.length,
      excelHeaders,
      selectedColumns: [selectedExcelColumn1, selectedExcelColumn2, selectedExcelColumn3]
    });

    if (!excelData || !excelHeaders) {
      console.log('Excel search validation failed - no data or headers');
      setSearchResults([]);
      setNotFound(true);
      setSearchedTerm('Excel Upload');
      return;
    }

    // Get column indices for combined search
    const hajryColumnIndex = excelHeaders.indexOf('Hajry');
    const mazayaColumnIndex = excelHeaders.indexOf('Mazaya');
    const buildingNoColumnIndex = excelHeaders.indexOf('Building No.');

    // Check if at least one of the expected columns exists
    if (hajryColumnIndex === -1 && mazayaColumnIndex === -1 && buildingNoColumnIndex === -1) {
      console.log('Excel search validation failed - no recognized columns found');
      console.log('Available columns:', excelHeaders);
      setSearchResults([]);
      setNotFound(true);
      setSearchedTerm('Excel Upload');
      return;
    }

    console.log('Column detection results:', {
      hajryColumnIndex,
      mazayaColumnIndex,
      buildingNoColumnIndex,
      availableColumns: excelHeaders
    });

    setIsProcessingExcel(true);
    const allResultsMap = new Map<string, DeedEntry>();
    let totalSearchTerms = 0;
    let foundMatches = 0;

    excelData.forEach((row, rowIndex) => {
      // Get values from each column
      const hajryValue = hajryColumnIndex !== -1 && row[hajryColumnIndex] ? row[hajryColumnIndex].toString().trim() : '';
      const mazayaValue = mazayaColumnIndex !== -1 && row[mazayaColumnIndex] ? row[mazayaColumnIndex].toString().trim() : '';
      const buildingNoValue = buildingNoColumnIndex !== -1 && row[buildingNoColumnIndex] ? row[buildingNoColumnIndex].toString().trim() : '';

      // Skip rows with no search values
      if (!hajryValue && !mazayaValue && !buildingNoValue) {
        return;
      }

      totalSearchTerms++;
      console.log(`Row ${rowIndex + 1}: Hajry="${hajryValue}", Mazaya="${mazayaValue}", Building="${buildingNoValue}"`);

      let rowResults: DeedEntry[] = [];

      // Combined search logic
      if (hajryValue && buildingNoValue) {
        // Hajry + Building No. search
        console.log(`🔍 Combined search: Hajry "${hajryValue}" + Building "${buildingNoValue}"`);
        rowResults = deedData.filter(entry =>
          entry.mazaya === hajryValue &&
          (entry.buildingNo === buildingNoValue || (buildingNoValue === '1142' && entry.buildingNo === 'OMZ1'))
        );
        console.log(`Found ${rowResults.length} matches for Hajry+Building combination`);
      } else if (mazayaValue && buildingNoValue) {
        // Mazaya + Building No. search
        console.log(`🔍 Combined search: Mazaya "${mazayaValue}" + Building "${buildingNoValue}"`);
        rowResults = deedData.filter(entry =>
          entry.title === mazayaValue &&
          (entry.buildingNo === buildingNoValue || (buildingNoValue === '1142' && entry.buildingNo === 'OMZ1'))
        );
        console.log(`Found ${rowResults.length} matches for Mazaya+Building combination`);
      } else if (hajryValue) {
        // Hajry only search
        console.log(`🔍 Hajry only search: "${hajryValue}"`);
        rowResults = deedData.filter(entry => entry.mazaya === hajryValue);
        console.log(`Found ${rowResults.length} matches for Hajry only`);
      } else if (mazayaValue) {
        // Mazaya only search
        console.log(`🔍 Mazaya only search: "${mazayaValue}"`);
        rowResults = deedData.filter(entry => entry.title === mazayaValue);
        console.log(`Found ${rowResults.length} matches for Mazaya only`);
      } else if (buildingNoValue) {
        // Building No. only search
        console.log(`🔍 Building No. only search: "${buildingNoValue}"`);
        rowResults = deedData.filter(entry =>
          entry.buildingNo === buildingNoValue || (buildingNoValue === '1142' && entry.buildingNo === 'OMZ1')
        );
        console.log(`Found ${rowResults.length} matches for Building No. only`);
      }

      if (rowResults.length > 0) {
        foundMatches++;
        rowResults.forEach(result => {
          const key = getDeedEntryKey(result);
          allResultsMap.set(key, result);
        });
      }
    });

    const aggregatedResults = Array.from(allResultsMap.values());

    console.log('Excel search completed:', {
      totalSearchTerms,
      foundMatches,
      uniqueResults: aggregatedResults.length
    });

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
                    <SelectContent className="bg-white dark:bg-gray-800 border-border shadow-lg z-50 backdrop-blur-none">
                      <SelectItem value="hajryOnly" className="hover:bg-accent focus:bg-accent">General Search</SelectItem>
                      <SelectItem value="hajrySearch" className="hover:bg-accent focus:bg-accent">Hajry Search</SelectItem>
                      <SelectItem value="hajryAndBuilding" className="hover:bg-accent focus:bg-accent">Combined Search</SelectItem>
                      <SelectItem value="mazayaSearch" className="hover:bg-accent focus:bg-accent">Mazaya Search</SelectItem>
                      <SelectItem value="excelFile" className="hover:bg-accent focus:bg-accent">Excel Upload</SelectItem>
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
                    <SelectContent className="bg-white dark:bg-gray-800 border-border shadow-lg z-50 backdrop-blur-none">
                      <SelectItem value="compact" className="hover:bg-accent focus:bg-accent">Search Mode</SelectItem>
                      <SelectItem value="full" className="hover:bg-accent focus:bg-accent">View All Records</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Search Input Section */}
              {!showFullTable && searchType !== 'excelFile' && (
                <div className="bg-gradient-secondary rounded-xl p-6 border border-border/50">
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-6">
                    <div className="lg:col-span-5">
                      <Label htmlFor="mainInput" className="text-sm font-medium text-foreground mb-2 block">
                        {getInputLabel()}
                      </Label>
                      <Input
                        id="mainInput"
                        type="text"
                        placeholder={getInputPlaceholder()}
                        value={hajryInput}
                        onChange={(e) => {
                          setHajryInput(e.target.value);
                          clearSearchResults();
                        }}
                        className="h-11 bg-background border-border hover:border-primary/50 focus:border-primary transition-colors text-base"
                        aria-label={getInputLabel()}
                      />
                    </div>

                    {searchType === 'hajryAndBuilding' && (
                      <div className="lg:col-span-4">
                        <Label htmlFor="buildingNoInput" className="text-sm font-medium text-foreground mb-2 block">
                          Building Number
                        </Label>
                        <Input
                          id="buildingNoInput"
                          type="text"
                          placeholder="e.g., A, 1143, OMZ1"
                          value={buildingNoInput}
                          onChange={(e) => {
                            setBuildingNoInput(e.target.value);
                            clearSearchResults();
                          }}
                          className="h-11 bg-background border-border hover:border-primary/50 focus:border-primary transition-colors text-base"
                          aria-label="Building Number Input"
                        />
                      </div>
                    )}

                    <div className={`${searchType === 'hajryAndBuilding' ? 'lg:col-span-3' : 'lg:col-span-7'} flex items-end`}>
                      <Button
                        type="submit"
                        className="w-full h-11 bg-gradient-primary hover:opacity-90 transition-opacity font-medium shadow-md"
                        disabled={!hajryInput.trim() && (!buildingNoInput.trim() || searchType !== 'hajryAndBuilding')}
                      >
                        <Search className="mr-2 h-5 w-5" />
                        Search Properties
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </form>

            {/* Excel Upload Section */}
            {searchType === 'excelFile' && !showFullTable && (
              <div className="bg-gradient-secondary rounded-xl p-8 border border-border/50 animate-slide-up">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <UploadCloud className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Excel File Upload</h3>
                  <p className="text-muted-foreground text-sm">
                    Upload your Excel file to search through multiple properties at once
                  </p>
                </div>

                <div className="max-w-2xl mx-auto space-y-6">
                  {/* Download Template Section */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-blue-800 flex items-center">
                          <Download className="mr-2 h-4 w-4" />
                          Download Template File
                        </h4>
                        <p className="text-sm text-blue-700 mt-1">
                          Get an Excel template with Hajry, Mazaya, and Building No. columns for combined search functionality
                        </p>
                      </div>
                      <Button
                        onClick={downloadTemplate}
                        variant="outline"
                        className="bg-blue-600 text-white hover:bg-blue-700 border-blue-600 ml-4"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="excelFile" className="text-sm font-medium text-foreground">
                      Select Excel File
                    </Label>
                    <Input
                      id="excelFile"
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleFileChange}
                      className="h-12 bg-background border-border hover:border-primary/50 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 file:transition-colors"
                    />
                    <p className="text-xs text-muted-foreground">
                      Supported formats: .xlsx, .xls, .csv (Max size: 10MB)
                    </p>
                  </div>

                  {excelHeaders && (
                    <div className="space-y-4">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 className="font-medium text-green-800 mb-2">✅ Excel File Loaded Successfully</h4>
                        <p className="text-sm text-green-700">
                          Found {excelHeaders.length} columns and {excelData?.length || 0} data rows
                        </p>
                        <div className="mt-2 text-xs text-green-600">
                          <strong>Columns:</strong> {excelHeaders.join(', ')}
                        </div>
                        {excelData && excelData.length > 0 && (
                          <div className="mt-2 text-xs text-green-600">
                            <strong>Sample data:</strong> {excelData.slice(0, 3).map((row, i) =>
                              `Row ${i + 1}: ${row.join(', ')}`
                            ).join(' | ')}
                          </div>
                        )}
                      </div>

                      <h4 className="font-medium text-foreground">Automatic Column Detection</h4>
                      <p className="text-sm text-muted-foreground">
                        The system automatically detects and uses Hajry, Mazaya, and Building No. columns for combined search.
                      </p>

                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <h5 className="font-medium text-gray-800 mb-2">🔍 Available Search Combinations:</h5>
                        <ul className="text-sm text-gray-700 space-y-1">
                          <li>• <strong>Hajry + Building No.</strong> - Most precise search</li>
                          <li>• <strong>Mazaya + Building No.</strong> - Alternative precise search</li>
                          <li>• <strong>Hajry only</strong> - Broader search by Hajry values</li>
                          <li>• <strong>Mazaya only</strong> - Broader search by Mazaya values</li>
                          <li>• <strong>Building No. only</strong> - Search by building number</li>
                        </ul>
                        <p className="text-xs text-gray-600 mt-2">
                          The system will automatically use the best combination based on available data in each row.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Button
                          onClick={handleExcelSearch}
                          disabled={isProcessingExcel || !excelData || !excelHeaders}
                          className="w-full bg-gradient-primary hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          {isProcessingExcel ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                              Processing Excel Data...
                            </>
                          ) : (
                            <>
                              <Search className="mr-2 h-4 w-4" />
                              Search from Excel Data
                            </>
                          )}
                        </Button>

                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Professional Results Section */}
            {(searchResults.length > 0 || (showFullTable && searchResults.length > 0)) && (
              <Card className="shadow-professional border-0 bg-card/50 backdrop-blur-sm animate-slide-up">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl font-semibold text-foreground flex items-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                        Search Results
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Found <span className="font-medium text-primary">{searchResults.length}</span> matching entries
                        {searchedTerm === 'Excel Upload' ? ' from uploaded file' : ''}
                        {showFullTable && ' - displaying all records'}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">
                        {new Date().toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="overflow-x-auto custom-scrollbar">
                    <Table className="min-w-full">
                      <TableHeader>
                        <TableRow className="border-border/50 hover:bg-muted/50">
                          {(searchType === 'excelFile' || searchedTerm === 'Excel Upload') ? (
                            <>
                              <TableHead className="font-semibold text-foreground bg-muted/30">Building No.</TableHead>
                              <TableHead className="font-semibold text-foreground bg-muted/30">Hajry</TableHead>
                              <TableHead className="font-semibold text-foreground bg-muted/30">Mazaya</TableHead>
                              <TableHead className="font-semibold text-foreground bg-muted/30">Plot (Source: HajryPlotNumber)</TableHead>
                              <TableHead className="font-semibold text-foreground bg-muted/30">Reference Deed</TableHead>
                              {showFullTable && <TableHead className="font-semibold text-foreground bg-muted/30">Municipality/Title Deed</TableHead>}
                            </>
                          ) : (
                            <>
                              <TableHead className="font-semibold text-foreground bg-muted/30">Building No.</TableHead>
                              <TableHead className="font-semibold text-foreground bg-muted/30">Hajry</TableHead>
                              <TableHead className="font-semibold text-foreground bg-muted/30">Mazaya</TableHead>
                              {!showFullTable && <TableHead className="font-semibold text-foreground bg-muted/30">Plot (Source: HajryPlotNumber)</TableHead>}
                              <TableHead className="font-semibold text-foreground bg-muted/30">Reference Deed</TableHead>
                              {showFullTable && <TableHead className="font-semibold text-foreground bg-muted/30">Municipality/Title Deed</TableHead>}
                              {showFullTable && <TableHead className="font-semibold text-foreground bg-muted/30">Actual Hajry Plot No.</TableHead>}
                            </>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {searchResults.map((result, index) => (
                          <TableRow
                            key={`${getDeedEntryKey(result)}-${index}`}
                            className="border-border/30 hover:bg-muted/30 transition-colors"
                          >
                            {(searchType === 'excelFile' || searchedTerm === 'Excel Upload') ? (
                              <>
                                <TableCell className="font-medium">
                                  <span className="px-2 py-1 bg-primary/10 text-primary rounded-md text-sm">
                                    {result.buildingNo === "OMZ1" ? "1142" : result.buildingNo || '-'}
                                  </span>
                                </TableCell>
                                <TableCell className="font-mono text-sm">
                                  {result.mazaya || <span className="text-muted-foreground">-</span>}
                                </TableCell>
                                <TableCell className="font-mono text-sm">
                                  {result.title || <span className="text-muted-foreground">-</span>}
                                </TableCell>
                                <TableCell className="font-mono text-sm">
                                  {result.hajryPlotNumber || <span className="text-muted-foreground">-</span>}
                                </TableCell>
                                <TableCell>
                                  <span className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                                    {result.referenceDeed === "1142" ? "OMZ1" : result.referenceDeed || '-'}
                                  </span>
                                </TableCell>
                                {showFullTable && (
                                  <TableCell className="font-mono text-sm">
                                    {result.municipalityTitleDeed || <span className="text-muted-foreground">-</span>}
                                  </TableCell>
                                )}
                              </>
                            ) : (
                              <>
                                <TableCell className="font-medium">
                                  <span className="px-2 py-1 bg-primary/10 text-primary rounded-md text-sm">
                                    {result.buildingNo === "OMZ1" ? "1142" : result.buildingNo || '-'}
                                  </span>
                                </TableCell>
                                <TableCell className="font-mono text-sm">
                                  {result.mazaya || <span className="text-muted-foreground">-</span>}
                                </TableCell>
                                <TableCell className="font-mono text-sm">
                                  {result.title || <span className="text-muted-foreground">-</span>}
                                </TableCell>
                                {!showFullTable && (
                                  <TableCell className="font-mono text-sm">
                                    {result.hajryPlotNumber || <span className="text-muted-foreground">-</span>}
                                  </TableCell>
                                )}
                                <TableCell>
                                  <span className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                                    {result.referenceDeed === "1142" ? "OMZ1" : result.referenceDeed || '-'}
                                  </span>
                                </TableCell>
                                {showFullTable && (
                                  <TableCell className="font-mono text-sm">
                                    {result.municipalityTitleDeed || <span className="text-muted-foreground">-</span>}
                                  </TableCell>
                                )}
                                {showFullTable && (
                                  <TableCell className="font-mono text-sm">
                                    {result.hajryPlotNumber || <span className="text-muted-foreground">-</span>}
                                  </TableCell>
                                )}
                              </>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Professional No Results State */}
            {notFound && (searchedTerm || (searchType === 'hajryAndBuilding' && searchedBuildingNoTerm) || (searchedTerm === 'Excel Upload' && searchResults.length === 0) ) && !showFullTable && (
              <Card className="shadow-card border-destructive/20 bg-destructive/5 animate-slide-up">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search className="w-8 h-8 text-destructive" />
                    </div>
                    <h3 className="text-lg font-semibold text-destructive mb-2">No Results Found</h3>
                    <div className="text-sm text-muted-foreground max-w-md mx-auto space-y-2">
                      <p>
                        No properties match your search criteria
                        {searchedTerm && searchedTerm !== 'Excel Upload' && (
                          <span className="block mt-1">
                            <span className="font-medium">
                              {searchType === 'hajryOnly' && 'General Search: '}
                              {searchType === 'hajrySearch' && 'Hajry Search: '}
                              {searchType === 'hajryAndBuilding' && 'Hajry Details: '}
                              {searchType === 'mazayaSearch' && 'Mazaya Search: '}
                            </span>
                            <span className="font-mono bg-muted px-2 py-1 rounded text-xs">"{searchedTerm}"</span>
                          </span>
                        )}
                        {searchType === 'hajryAndBuilding' && searchedBuildingNoTerm && (
                          <span className="block mt-1">
                            <span className="font-medium">Building No.: </span>
                            <span className="font-mono bg-muted px-2 py-1 rounded text-xs">"{searchedBuildingNoTerm}"</span>
                          </span>
                        )}
                        {searchedTerm === 'Excel Upload' && (
                          <span className="block mt-1">
                            Please ensure your Excel file has columns named "Hajry", "Mazaya", or "Building No." and contains valid search terms.
                          </span>
                        )}
                      </p>
                      <p className="text-xs">
                        Try adjusting your search terms or check the spelling.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Professional Footer */}
      <footer className="bg-muted/30 border-t border-border/50 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-6 h-6 bg-primary/20 rounded-lg flex items-center justify-center">
                <Search className="w-3 h-3 text-primary" />
              </div>
              <span className="font-semibold text-foreground">DeedFind</span>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; {currentYear ?? new Date().getFullYear()} DeedFind. Professional Property Search System.
            </p>
            <div className="flex items-center justify-center space-x-6 text-xs text-muted-foreground">
              <span>194 Properties Indexed</span>
              <span>•</span>
              <span>Real-time Search</span>
              <span>•</span>
              <span>Excel Integration</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
