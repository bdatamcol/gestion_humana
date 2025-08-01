"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, X, Check, Search, Filter } from "lucide-react";
import { toast } from "sonner";

interface User {
  id: number;
  colaborador: string;
  correo_electronico: string;
  telefono: string;
  cedula: string;
  genero: string;
  fecha_ingreso: string;
  fecha_nacimiento: string;
  edad: number;
  rh: string;
  tipo_de_contrato: string;
  direccion_residencia: string;
  estado: string;
  motivo_retiro: string;
  fecha_retiro: string;
  empresas?: { nombre: string };
  cargos?: { nombre: string };
  sedes?: { nombre: string };
  eps?: { nombre: string };
  afp?: { nombre: string };
  cesantias?: { nombre: string };
  caja_de_compensacion?: { nombre: string };
}

interface Option {
  nombre: string;
}

export default function ExcelViewPage() {
  const router = useRouter();
  const supabase = createSupabaseClient();
  
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<{ userId: number; field: string } | null>(null);
  const [tempValue, setTempValue] = useState("");
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [columnFilters, setColumnFilters] = useState<{ [key: string]: string }>({});
  const [showFilters, setShowFilters] = useState(false);
  
  // Options for dropdowns
  const [empresas, setEmpresas] = useState<Option[]>([]);
  const [cargos, setCargos] = useState<Option[]>([]);
  const [sedes, setSedes] = useState<Option[]>([]);
  const [eps, setEps] = useState<Option[]>([]);
  const [afps, setAfps] = useState<Option[]>([]);
  const [cesantias, setCesantias] = useState<Option[]>([]);
  const [cajaDeCompensacionOptions, setCajaDeCompensacionOptions] = useState<Option[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  // Filter users based on search term and column filters
  useEffect(() => {
    let filtered = users;

    // Apply search term filter
    if (searchTerm) {
      filtered = filtered.filter(user => {
        const searchFields = [
          user.colaborador,
          user.correo_electronico,
          user.telefono,
          user.cedula,
          user.empresas?.nombre,
          user.cargos?.nombre,
          user.sedes?.nombre,
          user.eps?.nombre,
          user.afp?.nombre,
          user.cesantias?.nombre,
          user.caja_de_compensacion?.nombre,
          user.direccion_residencia,
          user.estado,
          user.genero,
          user.rh,
          user.tipo_de_contrato
        ];
        
        return searchFields.some(field => 
          field?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    // Apply column filters
    Object.entries(columnFilters).forEach(([column, filterValue]) => {
      if (filterValue && filterValue !== 'all') {
        filtered = filtered.filter(user => {
          let fieldValue = '';
          switch (column) {
            case 'nombre':
              fieldValue = user.colaborador || '';
              break;
            case 'correo':
              fieldValue = user.correo_electronico || '';
              break;
            case 'empresa':
              fieldValue = user.empresas?.nombre || '';
              break;
            case 'cargo':
              fieldValue = user.cargos?.nombre || '';
              break;
            case 'sede':
              fieldValue = user.sedes?.nombre || '';
              break;
            case 'estado':
              fieldValue = user.estado || '';
              break;
            case 'genero':
              fieldValue = user.genero === 'M' ? 'Masculino' : user.genero === 'F' ? 'Femenino' : user.genero || '';
              break;
            case 'eps':
              fieldValue = user.eps?.nombre || '';
              break;
            case 'afp':
              fieldValue = user.afp?.nombre || '';
              break;
            case 'cesantias':
              fieldValue = user.cesantias?.nombre || '';
              break;
            case 'caja_compensacion':
              fieldValue = user.caja_de_compensacion?.nombre || '';
              break;
            case 'rh':
              fieldValue = user.rh || '';
              break;
            case 'tipo_de_contrato':
              fieldValue = user.tipo_de_contrato || '';
              break;
            default:
              fieldValue = '';
          }
          // Use exact match for certain fields, partial match for others
          if (column === 'estado' || column === 'genero') {
            return fieldValue.toLowerCase() === filterValue.toLowerCase();
          } else {
            return fieldValue.toLowerCase().includes(filterValue.toLowerCase());
          }
        });
      }
    });

    setFilteredUsers(filtered);
  }, [users, searchTerm, columnFilters]);

  const fetchData = async () => {
    try {
      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('usuario_nomina')
        .select(`
          *,
          empresas(nombre),
          cargos(nombre),
          sedes(nombre),
          eps(nombre),
          afp(nombre),
          cesantias(nombre),
          caja_de_compensacion(nombre)
        `);

      if (usersError) throw usersError;
      setUsers(usersData || []);
      setFilteredUsers(usersData || []);

      // Fetch options for dropdowns
      const [empresasRes, cargosRes, sedesRes, epsRes, afpsRes, cesantiasRes, cajaRes] = await Promise.all([
        supabase.from('empresas').select('nombre'),
        supabase.from('cargos').select('nombre'),
        supabase.from('sedes').select('nombre'),
        supabase.from('eps').select('nombre'),
        supabase.from('afp').select('nombre'),
        supabase.from('cesantias').select('nombre'),
        supabase.from('caja_de_compensacion').select('nombre')
      ]);

      setEmpresas(empresasRes.data || []);
      setCargos(cargosRes.data || []);
      setSedes(sedesRes.data || []);
      setEps(epsRes.data || []);
      setAfps(afpsRes.data || []);
      setCesantias(cesantiasRes.data || []);
      setCajaDeCompensacionOptions(cajaRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleCellEdit = (userId: number, field: string, currentValue: string) => {
    setEditingCell({ userId, field });
    setTempValue(currentValue || '');
  };

  const handleCellSave = async () => {
    if (!editingCell) return;

    try {
      const { userId, field } = editingCell;
      let updateData: any = {};

      // Map field names to database columns
      const fieldMapping: { [key: string]: string } = {
        'nombre': 'colaborador',
        'correo': 'correo_electronico',
        'telefono': 'telefono',
        'cedula': 'cedula',
        'genero': 'genero',
        'fecha_ingreso': 'fecha_ingreso',
        'fecha_nacimiento': 'fecha_nacimiento',
        'edad': 'edad',
        'rh': 'rh',
        'tipo_de_contrato': 'tipo_de_contrato',
        'direccion_residencia': 'direccion_residencia',
        'estado': 'estado',
        'motivo_retiro': 'motivo_retiro',
        'fecha_retiro': 'fecha_retiro'
      };

      if (fieldMapping[field]) {
        updateData[fieldMapping[field]] = tempValue;
      } else {
        // Handle foreign key fields
        const foreignKeyMapping: { [key: string]: string } = {
          'empresa': 'empresa_id',
          'cargo': 'cargo_id',
          'sede': 'sede_id',
          'eps': 'eps_id',
          'afp': 'afp_id',
          'cesantias': 'cesantias_id',
          'caja_compensacion': 'caja_compensacion_id'
        };

        if (foreignKeyMapping[field]) {
          const tableName = field === 'caja_compensacion' ? 'caja_de_compensacion' : field + 's';
          const { data: optionData } = await supabase
            .from(tableName)
            .select('id')
            .eq('nombre', tempValue)
            .single();

          if (optionData) {
            updateData[foreignKeyMapping[field]] = optionData.id;
          }
        }
      }

      const { error } = await supabase
        .from('usuario_nomina')
        .update(updateData)
        .eq('id', userId);

      if (error) throw error;

      // Update local state
      setUsers(prev => prev.map(user => {
        if (user.id === userId) {
          const updatedUser = { ...user };
          if (fieldMapping[field]) {
            (updatedUser as any)[fieldMapping[field]] = tempValue;
          }
          return updatedUser;
        }
        return user;
      }));

      toast.success('Campo actualizado correctamente');
    } catch (error) {
      console.error('Error updating field:', error);
      toast.error('Error al actualizar el campo');
    } finally {
      setEditingCell(null);
      setTempValue('');
    }
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setTempValue('');
  };

  const renderEditableCell = (user: User, field: string, value: string, options?: Option[]) => {
    const isEditing = editingCell?.userId === user.id && editingCell?.field === field;

    if (isEditing) {
      if (options) {
        return (
          <div className="excel-cell-editing">
            <Select value={tempValue} onValueChange={setTempValue}>
              <SelectTrigger className="excel-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map((option, index) => (
                  <SelectItem key={index} value={option.nombre}>
                    {option.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="excel-cell-actions">
              <Button size="sm" variant="ghost" onClick={handleCellSave} className="excel-save-btn">
                <Check className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCellCancel} className="excel-cancel-btn">
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        );
      } else {
        return (
          <div className="excel-cell-editing">
            <Input
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              className="excel-input"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCellSave();
                if (e.key === 'Escape') handleCellCancel();
              }}
              autoFocus
            />
            <div className="excel-cell-actions">
              <Button size="sm" variant="ghost" onClick={handleCellSave} className="excel-save-btn">
                <Check className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCellCancel} className="excel-cancel-btn">
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        );
      }
    }

    return (
      <div
        className="excel-cell"
        onClick={() => handleCellEdit(user.id, field, value)}
      >
        {value || '-'}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="excel-container">
        <div className="excel-header">
          <Button variant="outline" onClick={() => router.back()} className="excel-back-btn">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <h1 className="excel-title">Vista Dinámica - Usuarios</h1>
        </div>
        <div className="excel-loading">
          Cargando datos...
        </div>
      </div>
    );
  }

  const handleColumnFilter = (column: string, value: string) => {
    setColumnFilters(prev => ({
      ...prev,
      [column]: value === 'all' ? '' : value
    }));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setColumnFilters({});
  };

  const getFilteredUniqueValues = (field: string) => {
    const values = new Set<string>();
    
    // Filter users based on current filters (excluding the field we're getting values for)
    let filteredUsers = users.filter(user => {
      return Object.entries(columnFilters).every(([filterField, filterValue]) => {
        if (filterField === field || !filterValue || filterValue === 'all') return true;
        
        let userValue = '';
        switch (filterField) {
          case 'empresa':
            userValue = user.empresas?.nombre || '';
            break;
          case 'cargo':
            userValue = user.cargos?.nombre || '';
            break;
          case 'sede':
            userValue = user.sedes?.nombre || '';
            break;
          case 'estado':
            userValue = user.estado || '';
            break;
          case 'genero':
            userValue = user.genero === 'M' ? 'Masculino' : user.genero === 'F' ? 'Femenino' : user.genero || '';
            break;
          case 'eps':
            userValue = user.eps?.nombre || '';
            break;
        }
        return userValue.toLowerCase() === filterValue.toLowerCase();
      });
    });
    
    // Get unique values from filtered users
    filteredUsers.forEach(user => {
      let value = '';
      switch (field) {
        case 'empresa':
          value = user.empresas?.nombre || '';
          break;
        case 'cargo':
          value = user.cargos?.nombre || '';
          break;
        case 'sede':
          value = user.sedes?.nombre || '';
          break;
        case 'estado':
          value = user.estado || '';
          break;
        case 'genero':
          value = user.genero === 'M' ? 'Masculino' : user.genero === 'F' ? 'Femenino' : user.genero || '';
          break;
        case 'eps':
          value = user.eps?.nombre || '';
          break;
      }
      if (value) values.add(value);
    });
    return Array.from(values).sort();
  };

  return (
    <div className="excel-container">
      <div className="excel-header bg-white">
        <Button variant="outline" onClick={() => router.back()} className="excel-back-btn" style={{color: 'black'}}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <h1 className="excel-title">Vista Dinámica - Usuarios ({filteredUsers.length} de {users.length})</h1>
        <div className="excel-header-actions">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowFilters(!showFilters)}
            className="excel-filter-btn"
            style={{color: 'black'}}
          >
            <Filter className="h-4 w-4 mr-1" />
            Filtros
          </Button>
          {(searchTerm || Object.keys(columnFilters).length > 0) && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearFilters}
              className="excel-clear-btn"
              style={{color: 'black'}}
            >
              Limpiar
            </Button>
          )}
        </div>
      </div>
      <div className="excel-search-bar">
        <div className="excel-search-input">
          <Input
            placeholder="Buscar en todos los campos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="excel-search-field"
          />
        </div>
      </div>

      {showFilters && (
        <div className="excel-filters-panel" style={{backgroundColor: 'white'}}>
          <div className="excel-filters-container">
            <div className="excel-filters-row">
              <div className="excel-filter-item">
                <label>Empresa:</label>
                <Select value={columnFilters.empresa || 'all'} onValueChange={(value) => {
                  // Clear dependent filters when empresa changes
                  if (value !== columnFilters.empresa) {
                    setColumnFilters(prev => ({
                      empresa: value === 'all' ? '' : value,
                      cargo: '',
                      sede: '',
                      eps: ''
                    }));
                  } else {
                    handleColumnFilter('empresa', value);
                  }
                }}>
                  <SelectTrigger className="excel-filter-select">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {getFilteredUniqueValues('empresa').map(value => (
                      <SelectItem key={value} value={value}>{value}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="excel-filter-item">
                <label>Cargo:</label>
                <Select value={columnFilters.cargo || 'all'} onValueChange={(value) => handleColumnFilter('cargo', value)}>
                  <SelectTrigger className="excel-filter-select">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {getFilteredUniqueValues('cargo').map(value => (
                      <SelectItem key={value} value={value}>{value}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="excel-filter-item">
                <label>Sede:</label>
                <Select value={columnFilters.sede || 'all'} onValueChange={(value) => handleColumnFilter('sede', value)}>
                  <SelectTrigger className="excel-filter-select">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {getFilteredUniqueValues('sede').map(value => (
                      <SelectItem key={value} value={value}>{value}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="excel-filters-row">
              <div className="excel-filter-item">
                <label>Estado:</label>
                <Select value={columnFilters.estado || 'all'} onValueChange={(value) => handleColumnFilter('estado', value)}>
                  <SelectTrigger className="excel-filter-select">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {getFilteredUniqueValues('estado').map(value => (
                      <SelectItem key={value} value={value}>{value}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="excel-filter-item">
                <label>Género:</label>
                <Select value={columnFilters.genero || 'all'} onValueChange={(value) => handleColumnFilter('genero', value)}>
                  <SelectTrigger className="excel-filter-select">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {getFilteredUniqueValues('genero').map(value => (
                      <SelectItem key={value} value={value}>{value}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="excel-filter-item">
                <label>EPS:</label>
                <Select value={columnFilters.eps || 'all'} onValueChange={(value) => handleColumnFilter('eps', value)}>
                  <SelectTrigger className="excel-filter-select">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {getFilteredUniqueValues('eps').map(value => (
                      <SelectItem key={value} value={value}>{value}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="excel-sheet">
        <div className="excel-table-container">
          <table className="excel-table">
            <thead>
              <tr className="excel-header-row">
                <th className="excel-header-cell excel-row-number">#</th>
                <th className="excel-header-cell">ID</th>
                <th className="excel-header-cell">Nombre</th>
                <th className="excel-header-cell">Correo</th>
                <th className="excel-header-cell">Teléfono</th>
                <th className="excel-header-cell">Cédula</th>
                <th className="excel-header-cell">Género</th>
                <th className="excel-header-cell">Fecha Ingreso</th>
                <th className="excel-header-cell">Fecha Nacimiento</th>
                <th className="excel-header-cell">Edad</th>
                <th className="excel-header-cell">RH</th>
                <th className="excel-header-cell">Tipo Contrato</th>
                <th className="excel-header-cell">Empresa</th>
                <th className="excel-header-cell">Cargo</th>
                <th className="excel-header-cell">Sede</th>
                <th className="excel-header-cell">EPS</th>
                <th className="excel-header-cell">AFP</th>
                <th className="excel-header-cell">Cesantías</th>
                <th className="excel-header-cell">Caja Compensación</th>
                <th className="excel-header-cell">Dirección</th>
                <th className="excel-header-cell">Estado</th>
                <th className="excel-header-cell">Motivo Retiro</th>
                <th className="excel-header-cell">Fecha Retiro</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user, index) => (
                <tr key={user.id} className="excel-row">
                  <td className="excel-cell excel-row-number">{index + 1}</td>
                  <td className="excel-cell excel-id-cell">{user.id}</td>
                  <td className="excel-cell">{renderEditableCell(user, 'nombre', user.colaborador)}</td>
                  <td className="excel-cell">{renderEditableCell(user, 'correo', user.correo_electronico)}</td>
                  <td className="excel-cell">{renderEditableCell(user, 'telefono', user.telefono)}</td>
                  <td className="excel-cell">{renderEditableCell(user, 'cedula', user.cedula)}</td>
                  <td className="excel-cell">{renderEditableCell(user, 'genero', user.genero === 'M' ? 'Masculino' : user.genero === 'F' ? 'Femenino' : user.genero, [{ nombre: 'Masculino' }, { nombre: 'Femenino' }])}</td>
                  <td className="excel-cell">{renderEditableCell(user, 'fecha_ingreso', user.fecha_ingreso)}</td>
                  <td className="excel-cell">{renderEditableCell(user, 'fecha_nacimiento', user.fecha_nacimiento)}</td>
                  <td className="excel-cell">{renderEditableCell(user, 'edad', user.edad?.toString())}</td>
                  <td className="excel-cell">{renderEditableCell(user, 'rh', user.rh, [{ nombre: 'O+' }, { nombre: 'O-' }, { nombre: 'A+' }, { nombre: 'A-' }, { nombre: 'B+' }, { nombre: 'B-' }, { nombre: 'AB+' }, { nombre: 'AB-' }])}</td>
                  <td className="excel-cell">{renderEditableCell(user, 'tipo_de_contrato', user.tipo_de_contrato, [{ nombre: 'Indefinido' }, { nombre: 'Fijo' }, { nombre: 'Obra o Labor' }, { nombre: 'Prestación de Servicios' }, { nombre: 'Aprendizaje' }, { nombre: 'Temporal' }])}</td>
                  <td className="excel-cell">{renderEditableCell(user, 'empresa', user.empresas?.nombre, empresas)}</td>
                  <td className="excel-cell">{renderEditableCell(user, 'cargo', user.cargos?.nombre, cargos)}</td>
                  <td className="excel-cell">{renderEditableCell(user, 'sede', user.sedes?.nombre, sedes)}</td>
                  <td className="excel-cell">{renderEditableCell(user, 'eps', user.eps?.nombre, eps)}</td>
                  <td className="excel-cell">{renderEditableCell(user, 'afp', user.afp?.nombre, afps)}</td>
                  <td className="excel-cell">{renderEditableCell(user, 'cesantias', user.cesantias?.nombre, cesantias)}</td>
                  <td className="excel-cell">{renderEditableCell(user, 'caja_compensacion', user.caja_de_compensacion?.nombre, cajaDeCompensacionOptions)}</td>
                  <td className="excel-cell">{renderEditableCell(user, 'direccion_residencia', user.direccion_residencia)}</td>
                  <td className="excel-cell">{renderEditableCell(user, 'estado', user.estado, [{ nombre: 'activo' }, { nombre: 'inactivo' }])}</td>
                  <td className="excel-cell">{renderEditableCell(user, 'motivo_retiro', user.motivo_retiro)}</td>
                  <td className="excel-cell">{renderEditableCell(user, 'fecha_retiro', user.fecha_retiro)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx>{`
        .excel-container {
          min-height: 100vh;
          background-color: #f0f0f0;
          font-family: 'Calibri', 'Segoe UI', sans-serif;
          margin: 0;
          padding: 0;
        }

        .excel-header {
          background: linear-gradient(to bottom, #217346, #1e5f3a);
          color: white;
          padding: 8px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid #0f3d26;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          justify-content: space-between;
        }

        .excel-header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .excel-back-btn {
          background: rgba(255, 255, 255, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          font-size: 12px;
          padding: 6px 12px;
          border-radius: 2px;
          transition: all 0.2s;
        }

        .excel-back-btn:hover {
          background: rgba(255, 255, 255, 0.25);
          color: white;
          transform: translateY(-1px);
        }

        .excel-title {
          font-size: 16px;
          font-weight: 400;
          margin: 0;
          letter-spacing: 0.5px;
          flex: 1;
        }

        .excel-filter-btn, .excel-clear-btn {
          background: rgba(255, 255, 255, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          font-size: 11px;
          padding: 4px 8px;
          border-radius: 2px;
          transition: all 0.2s;
          height: 28px;
        }

        .excel-filter-btn:hover, .excel-clear-btn:hover {
          background: rgba(255, 255, 255, 0.25);
          color: white;
          transform: translateY(-1px);
        }

        .excel-search-bar {
          background-color: #f8f8f8;
          border-bottom: 1px solid #d0d0d0;
          padding: 8px 16px;
        }

        .excel-search-input {
          position: relative;
          max-width: 400px;
        }

        .excel-search-icon {
          position: absolute;
          left: 8px;
          top: 50%;
          transform: translateY(-50%);
          color: #666;
          z-index: 1;
        }

        .excel-search-field {
          padding-left: 32px;
          border: 1px solid #c0c0c0;
          border-radius: 2px;
          font-size: 11px;
          font-family: 'Calibri', sans-serif;
          height: 28px;
          background-color: white;
        }

        .excel-search-field:focus {
          border-color: #0078d4;
          outline: none;
          box-shadow: 0 0 0 1px #0078d4;
        }

        .excel-filters-panel {
          background-color: #f0f0f0;
          border-bottom: 1px solid #d0d0d0;
          padding: 12px 16px;
        }

        .excel-filters-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .excel-filters-row {
          display: flex;
          gap: 16px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }

        .excel-filters-row:last-child {
          margin-bottom: 0;
        }

        .excel-filter-item {
          display: flex;
          flex: 1;
          min-width: 200px;
          flex-direction: column;
          gap: 4px;
        }

        .excel-filter-item label {
          font-size: 11px;
          font-weight: 600;
          color: #333;
          font-family: 'Calibri', sans-serif;
        }

        .excel-filter-select {
          border: 1px solid #c0c0c0;
          border-radius: 2px;
          font-size: 11px;
          font-family: 'Calibri', sans-serif;
          height: 26px;
          background-color: white;
        }

        .excel-filter-select:focus {
          border-color: #0078d4;
          outline: none;
          box-shadow: 0 0 0 1px #0078d4;
        }

        .excel-loading {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 400px;
          font-size: 14px;
          color: #666;
          background-color: white;
        }

        .excel-sheet {
          background-color: white;
          margin: 0;
          border: none;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          flex: 1;
        }

        .excel-table-container {
          overflow: auto;
          max-height: calc(100vh - 140px);
          border: 1px solid #c0c0c0;
          background-color: white;
        }

        .excel-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          font-size: 11px;
          font-family: 'Calibri', sans-serif;
          background-color: white;
        }

        .excel-header-row {
          background: linear-gradient(to bottom, #f8f8f8, #e8e8e8);
        }

        .excel-header-cell {
          background: linear-gradient(to bottom, #f8f8f8, #e8e8e8);
          border-right: 1px solid #c0c0c0;
          border-bottom: 1px solid #c0c0c0;
          padding: 6px 8px;
          text-align: center;
          font-weight: 600;
          font-size: 11px;
          color: #333;
          min-width: 90px;
          position: sticky;
          top: 0;
          z-index: 10;
          user-select: none;
          cursor: default;
          text-shadow: 0 1px 0 rgba(255,255,255,0.8);
        }

        .excel-header-cell:first-child {
          border-left: 1px solid #c0c0c0;
        }

        .excel-row {
          background-color: white;
        }

        .excel-row:hover {
          background-color: #f5f5f5;
        }

        .excel-cell {
          border-right: 1px solid #d0d0d0;
          border-bottom: 1px solid #d0d0d0;
          padding: 4px 6px;
          min-height: 18px;
          font-size: 11px;
          cursor: cell;
          position: relative;
          min-width: 90px;
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          vertical-align: middle;
          transition: all 0.1s;
        }

        .excel-cell:first-child {
          border-left: 1px solid #d0d0d0;
        }

        .excel-cell:hover {
          background-color: #e6f3ff;
          outline: 2px solid #0078d4;
          outline-offset: -2px;
          z-index: 5;
        }

        .excel-cell:focus {
          background-color: #cce8ff;
          outline: 3px solid #0078d4;
          outline-offset: -3px;
          z-index: 5;
        }

        .excel-row-number {
          background: linear-gradient(to bottom, #f8f8f8, #e8e8e8);
          text-align: center;
          font-weight: 600;
          color: #666;
          min-width: 50px;
          max-width: 50px;
          cursor: default;
          user-select: none;
          font-size: 10px;
          text-shadow: 0 1px 0 rgba(255,255,255,0.8);
        }

        .excel-id-cell {
          font-family: 'Consolas', 'Courier New', monospace;
          color: #666;
          text-align: center;
          font-size: 10px;
          background-color: #fafafa;
        }

        .excel-cell-editing {
          display: flex;
          align-items: center;
          gap: 2px;
          min-height: 20px;
          background-color: white;
          border: 2px solid #0078d4;
          padding: 1px;
          z-index: 10;
          position: relative;
        }

        .excel-input {
          border: none;
          font-size: 11px;
          font-family: 'Calibri', sans-serif;
          padding: 2px 4px;
          height: 16px;
          flex: 1;
          background: transparent;
          outline: none;
        }

        .excel-select {
          border: none;
          font-size: 11px;
          font-family: 'Calibri', sans-serif;
          height: 20px;
          flex: 1;
          background: white;
        }

        .excel-cell-actions {
          display: flex;
          gap: 1px;
          margin-left: 2px;
        }

        .excel-save-btn {
          background-color: #107c10;
          color: white;
          padding: 1px;
          height: 16px;
          width: 16px;
          border: none;
          border-radius: 1px;
          font-size: 10px;
          cursor: pointer;
        }

        .excel-save-btn:hover {
          background-color: #0e6e0e;
          color: white;
        }

        .excel-cancel-btn {
          background-color: #d13438;
          color: white;
          padding: 1px;
          height: 16px;
          width: 16px;
          border: none;
          border-radius: 1px;
          font-size: 10px;
          cursor: pointer;
        }

        .excel-cancel-btn:hover {
          background-color: #b52d32;
          color: white;
        }

        /* Scrollbar styling for Excel-like appearance */
        .excel-table-container::-webkit-scrollbar {
          width: 16px;
          height: 16px;
        }

        .excel-table-container::-webkit-scrollbar-track {
          background: #f1f1f1;
          border: 1px solid #c0c0c0;
        }

        .excel-table-container::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #e8e8e8, #d0d0d0);
          border: 1px solid #a0a0a0;
        }

        .excel-table-container::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #d0d0d0, #b8b8b8);
        }

        .excel-table-container::-webkit-scrollbar-corner {
          background: #f1f1f1;
          border: 1px solid #c0c0c0;
        }
      `}</style>
    </div>
  );
}