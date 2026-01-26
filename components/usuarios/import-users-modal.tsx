'use client'

import { useState, useRef } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, XCircle, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import { processUserImportBatch, UserImportResult } from '@/app/actions/user-import-export'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'

interface ImportUsersModalProps {
  onSuccess: () => void
}

export function ImportUsersModal({ onSuccess }: ImportUsersModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<any[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [importSummary, setImportSummary] = useState<UserImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setImportSummary(null)
    setProgress(0)
    
    // Analyze file immediately
    setIsAnalyzing(true)
    try {
      const data = await readExcelFile(selectedFile)
      setPreviewData(data.slice(0, 5)) // Preview first 5 rows
    } catch (error) {
      toast.error('Error al leer el archivo Excel')
      setFile(null)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const readExcelFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = e.target?.result
          const workbook = XLSX.read(data, { type: 'binary' })
          const sheetName = workbook.SheetNames[0]
          const sheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(sheet)
          resolve(jsonData)
        } catch (error) {
          reject(error)
        }
      }
      reader.onerror = reject
      reader.readAsBinaryString(file)
    })
  }

  const handleImport = async () => {
    if (!file) return

    setIsImporting(true)
    setProgress(0)
    setImportSummary(null)

    try {
      const allData = await readExcelFile(file)
      const totalRows = allData.length
      const BATCH_SIZE = 50
      
      let currentSummary: UserImportResult = {
        processed: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: []
      }

      // Helper to sanitize data for Server Actions
      const sanitizeData = (data: any[]): any[] => {
        return JSON.parse(JSON.stringify(data, (key, value) => {
          // Handle Date objects
          if (value instanceof Date) {
            return value.toISOString().split('T')[0] // Return YYYY-MM-DD
          }
          return value
        }))
      }

      for (let i = 0; i < totalRows; i += BATCH_SIZE) {
        const rawBatch = allData.slice(i, i + BATCH_SIZE)
        const batch = sanitizeData(rawBatch)
        
        const result = await processUserImportBatch(batch, i)
        
        // Merge results
        currentSummary = {
          processed: currentSummary.processed + result.processed,
          created: currentSummary.created + result.created,
          updated: currentSummary.updated + result.updated,
          skipped: currentSummary.skipped + result.skipped,
          errors: [...currentSummary.errors, ...result.errors]
        }

        // Update progress
        const currentProgress = Math.round(((i + batch.length) / totalRows) * 100)
        setProgress(currentProgress)
      }

      setImportSummary(currentSummary)
      if (currentSummary.errors.length === 0) {
        toast.success('Importación completada exitosamente')
        onSuccess()
      } else {
        toast.warning('Importación completada con algunos errores')
      }

    } catch (error: any) {
      toast.error('Error crítico en la importación: ' + error.message)
    } finally {
      setIsImporting(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setPreviewData([])
    setImportSummary(null)
    setProgress(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open)
      if (!open) handleReset()
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Importar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Importar Usuarios Masivamente</DialogTitle>
          <DialogDescription>
            Sube un archivo Excel (.xlsx) con los datos de los usuarios.
            Asegúrate de usar la plantilla correcta.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {!file && (
            <div 
              className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm font-medium">Click para seleccionar archivo</p>
              <p className="text-xs text-muted-foreground mt-1">Formato .xlsx soportado</p>
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".xlsx" 
                className="hidden" 
                onChange={handleFileChange}
              />
            </div>
          )}

          {file && !importSummary && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="font-medium text-sm">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB • {previewData.length > 0 ? 'Leído correctamente' : 'Analizando...'}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={handleReset} disabled={isImporting}>
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                </Button>
              </div>

              {previewData.length > 0 && (
                <div className="bg-muted/50 rounded-lg p-4 text-xs border">
                  <p className="font-semibold mb-3">Vista previa (primeras filas):</p>
                  <ScrollArea className="max-h-56">
                    <div className="min-w-full overflow-x-auto">
                      <table className="w-full text-left table-fixed">
                        <thead>
                          <tr className="border-b bg-background/60">
                            {Object.keys(previewData[0]).slice(0, 4).map(key => (
                              <th
                                key={key}
                                className="px-2 py-1 text-[11px] font-semibold text-muted-foreground whitespace-nowrap"
                              >
                                {key}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.map((row, i) => (
                            <tr key={i} className="border-b last:border-0">
                              {Object.values(row).slice(0, 4).map((val: any, j) => (
                                <td
                                  key={j}
                                  className="px-2 py-1 text-[11px] whitespace-nowrap align-middle"
                                >
                                  {String(val)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </ScrollArea>
                </div>
              )}

              {isImporting && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Procesando...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}
            </div>
          )}

          {importSummary && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Creados</span>
                  </div>
                  <p className="text-2xl font-bold text-green-700">{importSummary.created}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Actualizados</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-700">{importSummary.updated}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-800">Omitidos</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-700">{importSummary.skipped}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                  <div className="flex items-center gap-2 mb-1">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-red-800">Errores</span>
                  </div>
                  <p className="text-2xl font-bold text-red-700">{importSummary.errors.length}</p>
                </div>
              </div>

              {importSummary.errors.length > 0 && (
                <ScrollArea className="h-32 rounded-md border p-4">
                  <h4 className="text-sm font-semibold text-red-700 mb-2">Detalle de Errores:</h4>
                  <ul className="space-y-2">
                    {importSummary.errors.map((err, i) => (
                      <li key={i} className="text-xs text-red-600">
                        <span className="font-bold">Fila {err.row}:</span> {err.error}
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {importSummary ? (
            <Button onClick={() => setIsOpen(false)}>Cerrar</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={handleReset} disabled={isImporting}>
                Cancelar
              </Button>
              <Button onClick={handleImport} disabled={!file || isImporting}>
                {isImporting ? 'Importando...' : 'Confirmar Importación'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
