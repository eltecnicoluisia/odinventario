"use client";

import React, { useState, useEffect, useMemo } from "react";
import VenezuelaMap, { StateStats } from "../components/VenezuelaMap";
import { VENEZUELA_STATES_PATHS } from "../components/venezuelaData";

interface Item {
  id: number;
  codigo: string | null;
  numero_bien_nacional: string | null;
  tipo_articulo: string | null;
  nombre: string;
  descripcion: string | null;
  categoria: string | null;
  cantidad: number;
  precio_unitario: number;
  ubicacion: string | null;
  estado?: string | null;
  sede?: string | null;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
}

interface Sede {
  id: number;
  nombre: string;
  tipo: string;
  estado: string;
  ciudad: string | null;
  direccion: string | null;
  responsable: string | null;
  telefono: string | null;
  capacidad: string | null;
  items_count?: number;
  fecha_creacion?: string;
}

interface Category {
  id: number;
  nombre: string;
  descripcion: string | null;
  color: string | null;
  items_count?: number;
  fecha_creacion?: string;
}

interface ArticleType {
  id: number;
  nombre: string;
  descripcion: string | null;
  prefijo: string | null;
  items_count?: number;
  fecha_creacion?: string;
}

interface Stats {
  total_items: number;
  total_stock: number;
  total_value: number;
  low_stock: number;
  categories_count: number;
  categories: string[];
  tipos: string[];
  bien_nacional_count: number;
  total_sedes?: number;
  states_data?: Record<string, StateStats>;
  states_list?: string[];
}

const COLOR_PRESETS = [
  { name: "Azul", value: "#3b82f6" },
  { name: "Cian", value: "#06b6d4" },
  { name: "Púrpura", value: "#8b5cf6" },
  { name: "Esmeralda", value: "#10b981" },
  { name: "Ámbar", value: "#f59e0b" },
  { name: "Rosa", value: "#ec4899" },
  { name: "Índigo", value: "#6366f1" },
  { name: "Verde Azulado", value: "#14b8a6" },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<"inventory" | "map" | "categories" | "types" | "bulk">("inventory");
  
  // Data lists
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [types, setTypes] = useState<ArticleType[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [selectedMapState, setSelectedMapState] = useState<string | null>("Distrito Capital");
  const [stats, setStats] = useState<Stats>({
    total_items: 0,
    total_stock: 0,
    total_value: 0,
    low_stock: 0,
    categories_count: 0,
    categories: [],
    tipos: [],
    bien_nacional_count: 0,
  });
  
  const [loading, setLoading] = useState(true);

  // Filters for Items
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [selectedTipo, setSelectedTipo] = useState("Todos");
  const [stockFilter, setStockFilter] = useState<"todos" | "bajo" | "ok">("todos");

  // Filters for Categories & Types views
  const [searchCategory, setSearchCategory] = useState("");
  const [searchType, setSearchType] = useState("");

  // Modals visibility
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isIosModalOpen, setIsIosModalOpen] = useState(false);
  const [isSedeModalOpen, setIsSedeModalOpen] = useState(false);
  const [editingSede, setEditingSede] = useState<Sede | null>(null);
  const [sedeFormData, setSedeFormData] = useState({
    nombre: "",
    tipo: "Galpón",
    estado: "Distrito Capital",
    ciudad: "",
    direccion: "",
    responsable: "",
    telefono: "",
    capacidad: "",
  });

  // PWA Installation State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIosDevice, setIsIosDevice] = useState(false);

  // Editing Entities
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingType, setEditingType] = useState<ArticleType | null>(null);

  // Item Form State
  const [itemFormData, setItemFormData] = useState({
    codigo: "",
    numero_bien_nacional: "",
    tipo_articulo: "Activo Fijo",
    nombre: "",
    descripcion: "",
    categoria: "General",
    cantidad: 1,
    precio_unitario: 0.0,
    ubicacion: "",
    estado: "Distrito Capital",
    sede: "",
  });

  // Category Form State
  const [categoryFormData, setCategoryFormData] = useState({
    nombre: "",
    descripcion: "",
    color: "#3b82f6",
  });

  // Type Form State
  const [typeFormData, setTypeFormData] = useState({
    nombre: "",
    descripcion: "",
    prefijo: "",
  });

  // Bulk Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");

  // Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const API_URL = "/api";

  // Detect PWA & iOS environment
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      setIsIosDevice(isIos);

      const handleBeforeInstall = (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setIsInstallable(true);
      };

      window.addEventListener("beforeinstallprompt", handleBeforeInstall);
      return () => {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      };
    }
  }, []);

  const handleInstallApp = async () => {
    if (isIosDevice) {
      setIsIosModalOpen(true);
      return;
    }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        showToast("¡Aplicación ODInventario instalada con éxito!");
      }
      setDeferredPrompt(null);
      setIsInstallable(false);
    } else {
      showToast("Puedes instalarla desde el menú o barra de navegación de tu navegador", "success");
    }
  };

  // Fetch All Core Data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [resItems, resCats, resTypes, resStats, resSedes] = await Promise.all([
        fetch(`${API_URL}/items`),
        fetch(`${API_URL}/categories`),
        fetch(`${API_URL}/types`),
        fetch(`${API_URL}/stats`),
        fetch(`${API_URL}/sedes`),
      ]);

      if (resItems.ok) {
        const dataItems = await resItems.json();
        setItems(dataItems);
      }
      if (resCats.ok) {
        const dataCats = await resCats.json();
        setCategories(dataCats);
      }
      if (resTypes.ok) {
        const dataTypes = await resTypes.json();
        setTypes(dataTypes);
      }
      if (resStats.ok) {
        const dataStats = await resStats.json();
        setStats(dataStats);
      }
    } catch (err) {
      console.error("Error al conectar con la API:", err);
      showToast("Error de conexión con el servidor", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        item.nombre.toLowerCase().includes(search) ||
        (item.codigo && item.codigo.toLowerCase().includes(search)) ||
        (item.numero_bien_nacional && item.numero_bien_nacional.toLowerCase().includes(search)) ||
        (item.tipo_articulo && item.tipo_articulo.toLowerCase().includes(search)) ||
        (item.categoria && item.categoria.toLowerCase().includes(search)) ||
        (item.descripcion && item.descripcion.toLowerCase().includes(search)) ||
        (item.ubicacion && item.ubicacion.toLowerCase().includes(search));

      const matchesCat =
        selectedCategory === "Todas" || item.categoria === selectedCategory;

      const matchesTipo =
        selectedTipo === "Todos" || item.tipo_articulo === selectedTipo;

      const matchesStock =
        stockFilter === "todos"
          ? true
          : stockFilter === "bajo"
          ? item.cantidad <= 3
          : item.cantidad > 3;

      return matchesSearch && matchesCat && matchesTipo && matchesStock;
    });
  }, [items, searchTerm, selectedCategory, selectedTipo, stockFilter]);

  // Filtered Categories
  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      const s = searchCategory.toLowerCase();
      return (
        c.nombre.toLowerCase().includes(s) ||
        (c.descripcion && c.descripcion.toLowerCase().includes(s))
      );
    });
  }, [categories, searchCategory]);

  // Filtered Types
  const filteredTypes = useMemo(() => {
    return types.filter((t) => {
      const s = searchType.toLowerCase();
      return (
        t.nombre.toLowerCase().includes(s) ||
        (t.prefijo && t.prefijo.toLowerCase().includes(s)) ||
        (t.descripcion && t.descripcion.toLowerCase().includes(s))
      );
    });
  }, [types, searchType]);

  // ==================== ITEM CRUD HANDLERS ====================
  const handleOpenNewItemModal = () => {
    setEditingItem(null);
    setFormError("");
    setItemFormData({
      codigo: `ITM-${Math.floor(1000 + Math.random() * 9000)}`,
      numero_bien_nacional: `BN-${Math.floor(100000 + Math.random() * 900000)}`,
      tipo_articulo: types.length > 0 ? types[0].nombre : "Activo Fijo",
      nombre: "",
      descripcion: "",
      categoria: categories.length > 0 ? categories[0].nombre : "General",
      cantidad: 1,
      precio_unitario: 0.0,
      ubicacion: "",
      estado: selectedMapState || "Distrito Capital",
      sede: "",
    });
    setIsItemModalOpen(true);
  };

  const handleOpenEditItemModal = (item: Item) => {
    setEditingItem(item);
    setFormError("");
    setItemFormData({
      codigo: item.codigo || "",
      numero_bien_nacional: item.numero_bien_nacional || "",
      tipo_articulo: item.tipo_articulo || (types.length > 0 ? types[0].nombre : "Activo Fijo"),
      nombre: item.nombre,
      descripcion: item.descripcion || "",
      categoria: item.categoria || (categories.length > 0 ? categories[0].nombre : "General"),
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      ubicacion: item.ubicacion || "",
      estado: item.estado || "Distrito Capital",
      sede: item.sede || "",
    });
    setIsItemModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!itemFormData.nombre.trim()) {
      setFormError("El nombre del artículo es obligatorio.");
      showToast("El nombre del artículo es obligatorio", "error");
      return;
    }

    setIsSaving(true);
    try {
      if (editingItem) {
        const res = await fetch(`${API_URL}/items/${editingItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(itemFormData),
        });
        if (res.ok) {
          showToast(`Ítem '${itemFormData.nombre}' modificado con éxito`);
          setIsItemModalOpen(false);
          await fetchData();
        } else {
          setFormError("Error al modificar el ítem en el servidor.");
          showToast("Error al modificar ítem", "error");
        }
      } else {
        const res = await fetch(`${API_URL}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(itemFormData),
        });
        if (res.ok) {
          showToast(`Ítem '${itemFormData.nombre}' registrado con éxito`);
          setIsItemModalOpen(false);
          await fetchData();
        } else {
          setFormError("Error al registrar el ítem en el servidor.");
          showToast("Error al guardar ítem", "error");
        }
      }
    } catch (err) {
      setFormError("Error de comunicación con el backend.");
      showToast("Error de conexión", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdjustStock = async (id: number, delta: number) => {
    try {
      const res = await fetch(`${API_URL}/items/${id}/stock?delta=${delta}`, {
        method: "PATCH",
      });
      if (res.ok) {
        const updated = await res.json();
        setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
        fetch(`${API_URL}/stats`).then((r) => r.json()).then(setStats).catch(() => {});
      }
    } catch (err) {
      showToast("No se pudo ajustar el stock", "error");
    }
  };

  const handleDeleteItem = async (id: number, nombre: string) => {
    if (!confirm(`¿Confirmas eliminar definitivamente el ítem '${nombre}'?`)) return;
    try {
      const res = await fetch(`${API_URL}/items/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Ítem eliminado correctamente");
        fetchData();
      } else {
        showToast("Error al eliminar el ítem", "error");
      }
    } catch (err) {
      showToast("Error de conexión al eliminar", "error");
    }
  };

  // ==================== CATEGORY CRUD HANDLERS ====================
  const handleOpenNewCategoryModal = () => {
    setEditingCategory(null);
    setFormError("");
    setCategoryFormData({
      nombre: "",
      descripcion: "",
      color: "#3b82f6",
    });
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategoryModal = (cat: Category) => {
    setEditingCategory(cat);
    setFormError("");
    setCategoryFormData({
      nombre: cat.nombre,
      descripcion: cat.descripcion || "",
      color: cat.color || "#3b82f6",
    });
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!categoryFormData.nombre.trim()) {
      setFormError("El nombre de la categoría es obligatorio.");
      showToast("El nombre de la categoría es obligatorio", "error");
      return;
    }

    setIsSaving(true);
    try {
      if (editingCategory) {
        const res = await fetch(`${API_URL}/categories/${editingCategory.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(categoryFormData),
        });
        if (res.ok) {
          showToast(`Categoría '${categoryFormData.nombre}' actualizada con éxito`);
          setIsCategoryModalOpen(false);
          await fetchData();
        } else {
          const errData = await res.json().catch(() => ({}));
          setFormError(errData.detail || "Error al actualizar la categoría.");
          showToast(errData.detail || "Error al actualizar", "error");
        }
      } else {
        const res = await fetch(`${API_URL}/categories`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(categoryFormData),
        });
        if (res.ok) {
          showToast(`Categoría '${categoryFormData.nombre}' creada con éxito`);
          setIsCategoryModalOpen(false);
          await fetchData();
        } else {
          const errData = await res.json().catch(() => ({}));
          setFormError(errData.detail || "Error al crear la categoría.");
          showToast(errData.detail || "Error al crear categoría", "error");
        }
      }
    } catch (err) {
      setFormError("Error de conexión con el backend.");
      showToast("Error de conexión", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCategory = async (id: number, nombre: string) => {
    if (!confirm(`¿Eliminar la categoría '${nombre}'? Los artículos asociados permanecerán en el inventario.`)) return;
    try {
      const res = await fetch(`${API_URL}/categories/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast(`Categoría '${nombre}' eliminada correctamente`);
        fetchData();
      } else {
        showToast("Error al eliminar la categoría", "error");
      }
    } catch (err) {
      showToast("Error de conexión al eliminar", "error");
    }
  };

  // ==================== TYPE CRUD HANDLERS ====================
  const handleOpenNewTypeModal = () => {
    setEditingType(null);
    setFormError("");
    setTypeFormData({
      nombre: "",
      descripcion: "",
      prefijo: "",
    });
    setIsTypeModalOpen(true);
  };

  const handleOpenEditTypeModal = (tp: ArticleType) => {
    setEditingType(tp);
    setFormError("");
    setTypeFormData({
      nombre: tp.nombre,
      descripcion: tp.descripcion || "",
      prefijo: tp.prefijo || "",
    });
    setIsTypeModalOpen(true);
  };

  const handleSaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!typeFormData.nombre.trim()) {
      setFormError("El nombre del tipo de artículo es obligatorio.");
      showToast("El nombre del tipo es obligatorio", "error");
      return;
    }

    setIsSaving(true);
    try {
      if (editingType) {
        const res = await fetch(`${API_URL}/types/${editingType.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(typeFormData),
        });
        if (res.ok) {
          showToast(`Tipo '${typeFormData.nombre}' actualizado con éxito`);
          setIsTypeModalOpen(false);
          await fetchData();
        } else {
          const errData = await res.json().catch(() => ({}));
          setFormError(errData.detail || "Error al actualizar el tipo de artículo.");
          showToast(errData.detail || "Error al actualizar", "error");
        }
      } else {
        const res = await fetch(`${API_URL}/types`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(typeFormData),
        });
        if (res.ok) {
          showToast(`Tipo '${typeFormData.nombre}' creado con éxito`);
          setIsTypeModalOpen(false);
          await fetchData();
        } else {
          const errData = await res.json().catch(() => ({}));
          setFormError(errData.detail || "Error al crear el tipo de artículo.");
          showToast(errData.detail || "Error al crear tipo", "error");
        }
      }
    } catch (err) {
      setFormError("Error de conexión con el backend.");
      showToast("Error de conexión", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteType = async (id: number, nombre: string) => {
    if (!confirm(`¿Eliminar el tipo de artículo '${nombre}'?`)) return;
    try {
      const res = await fetch(`${API_URL}/types/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast(`Tipo '${nombre}' eliminado correctamente`);
        fetchData();
      } else {
        showToast("Error al eliminar el tipo de artículo", "error");
      }
    } catch (err) {
      showToast("Error de conexión al eliminar", "error");
    }
  };

  // ==================== SEDES (GALPONES, OFICINAS) HANDLERS ====================
  const handleOpenNewSedeModal = (initialState?: string) => {
    setEditingSede(null);
    setSedeFormData({
      nombre: "",
      tipo: "Galpón",
      estado: initialState || selectedMapState || "Distrito Capital",
      ciudad: "",
      direccion: "",
      responsable: "",
      telefono: "",
      capacidad: "",
    });
    setFormError("");
    setIsSedeModalOpen(true);
  };

  const handleEditSede = (sede: Sede) => {
    setEditingSede(sede);
    setSedeFormData({
      nombre: sede.nombre,
      tipo: sede.tipo,
      estado: sede.estado,
      ciudad: sede.ciudad || "",
      direccion: sede.direccion || "",
      responsable: sede.responsable || "",
      telefono: sede.telefono || "",
      capacidad: sede.capacidad || "",
    });
    setFormError("");
    setIsSedeModalOpen(true);
  };

  const handleSaveSede = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!sedeFormData.nombre.trim()) {
      setFormError("El nombre del galpón u oficina es obligatorio.");
      showToast("El nombre de la sede es obligatorio", "error");
      return;
    }

    setIsSaving(true);
    try {
      if (editingSede) {
        const res = await fetch(`${API_URL}/sedes/${editingSede.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sedeFormData),
        });
        if (res.ok) {
          showToast(`Sede '${sedeFormData.nombre}' actualizada con éxito`);
          setIsSedeModalOpen(false);
          await fetchData();
        } else {
          const errData = await res.json().catch(() => ({}));
          setFormError(errData.detail || "Error al actualizar la sede.");
          showToast(errData.detail || "Error al actualizar", "error");
        }
      } else {
        const res = await fetch(`${API_URL}/sedes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sedeFormData),
        });
        if (res.ok) {
          showToast(`Sede '${sedeFormData.nombre}' registrada en ${sedeFormData.estado}`);
          setIsSedeModalOpen(false);
          await fetchData();
        } else {
          const errData = await res.json().catch(() => ({}));
          setFormError(errData.detail || "Error al registrar la sede.");
          showToast(errData.detail || "Error al registrar sede", "error");
        }
      }
    } catch (err) {
      setFormError("Error de conexión con el backend.");
      showToast("Error de conexión", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSede = async (id: number, nombre: string) => {
    if (!confirm(`¿Eliminar la sede/galpón '${nombre}'?`)) return;
    try {
      const res = await fetch(`${API_URL}/sedes/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast(`Sede '${nombre}' eliminada correctamente`);
        fetchData();
      } else {
        showToast("Error al eliminar la sede", "error");
      }
    } catch (err) {
      showToast("Error de conexión al eliminar", "error");
    }
  };

  // ==================== BULK UPLOAD HANDLER ====================
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      showToast("Selecciona un archivo Excel, Word o PDF", "error");
      return;
    }
    setUploading(true);
    setUploadMessage("");
    const body = new FormData();
    body.append("file", uploadFile);

    try {
      const res = await fetch(`${API_URL}/items/upload`, {
        method: "POST",
        body,
      });
      const data = await res.json();
      if (res.ok) {
        setUploadMessage(data.message || "Archivo procesado con éxito.");
        showToast("Procesamiento con IA iniciado");
        setTimeout(() => {
          setIsBulkModalOpen(false);
          setUploadFile(null);
          setUploadMessage("");
          fetchData();
        }, 2000);
      } else {
        setUploadMessage("Error durante la carga");
        showToast("Error al procesar archivo", "error");
      }
    } catch (err) {
      setUploadMessage("Error de conexión");
      showToast("Error al subir archivo", "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white pb-20 md:pb-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-20 md:bottom-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 backdrop-blur-xl ${
            toast.type === "success"
              ? "bg-emerald-950/90 text-emerald-200 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
              : "bg-rose-950/90 text-rose-200 border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.3)]"
          }`}
        >
          <span className="text-lg">{toast.type === "success" ? "✓" : "⚠"}</span>
          <span className="font-medium text-sm">{toast.message}</span>
        </div>
      )}

      {/* Top Header with Glass Bevel */}
      <header className="glass-panel sticky top-0 z-40 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 rounded-b-2xl mx-1 sm:mx-2 mt-1 shadow-[0_10px_30px_rgba(0,0,0,0.5),0_0_20px_rgba(56,189,248,0.1)]">
        <button
          onClick={() => {
            setActiveTab("inventory");
            setIsItemModalOpen(false);
            setIsCategoryModalOpen(false);
            setIsTypeModalOpen(false);
            setIsBulkModalOpen(false);
          }}
          title="Ir a la pantalla principal (Inventario General)"
          className="flex items-center gap-3 sm:gap-4 group cursor-pointer text-left focus:outline-none"
        >
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.4)] border border-white/30 font-black text-lg sm:text-xl text-white group-hover:scale-105 group-hover:shadow-[0_0_25px_rgba(34,211,238,0.6)] transition-all">
            OD
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.2)] group-hover:text-cyan-300 transition-colors">
                ODINVENTARIO
              </h1>
              <span className="hidden sm:inline px-2 py-0.5 text-[10px] font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-400/30 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                Bienes Nacionales & Gestión PWA
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse"></span>
              Servidor Activo • 192.168.100.2:8088
            </p>
          </div>
        </button>

        {/* Global Quick Action Buttons */}
        <div className="flex items-center gap-2">
          {/* PWA Install Button */}
          <button
            onClick={handleInstallApp}
            title="Instalar como Aplicación en Windows, Android o iPhone"
            className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.35)] border border-white/25 transition-all active:scale-95 cursor-pointer"
          >
            <span>📲</span>
            <span className="hidden sm:inline">Instalar App</span>
            <span className="sm:hidden">Instalar</span>
          </button>

          <button
            onClick={fetchData}
            title="Refrescar catálogo"
            className="p-2 sm:p-2.5 rounded-xl glass-panel hover:border-cyan-400/40 text-slate-300 hover:text-white transition-all shadow-sm cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="hidden sm:flex px-3 py-2 rounded-xl glass-panel hover:border-cyan-400/50 text-slate-200 font-medium text-xs items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(6,182,212,0.15)] cursor-pointer"
          >
            <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span>Carga Masiva IA</span>
          </button>

          <button
            onClick={handleOpenNewCategoryModal}
            className="hidden md:flex px-3 py-2 rounded-xl glass-panel hover:border-blue-400/60 text-blue-300 font-medium text-xs items-center gap-1.5 transition-all cursor-pointer"
          >
            <span>+ Categoría</span>
          </button>

          <button
            onClick={handleOpenNewTypeModal}
            className="hidden md:flex px-3 py-2 rounded-xl glass-panel hover:border-purple-400/60 text-purple-300 font-medium text-xs items-center gap-1.5 transition-all cursor-pointer"
          >
            <span>+ Tipo</span>
          </button>

          <button
            onClick={handleOpenNewItemModal}
            className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs flex items-center gap-1.5 shadow-[0_0_20px_rgba(59,130,246,0.4)] border border-white/25 transition-all active:scale-95 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>+ Cargar Ítem</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="p-3 sm:p-6 max-w-7xl w-full mx-auto flex-1 flex flex-col gap-5">
        
        {/* Navigation Tabs with Glass Bevel (Desktop & Tablet) */}
        <nav className="hidden sm:flex glass-panel rounded-2xl p-1.5 items-center gap-1.5 shadow-lg border border-white/10">
          <button
            onClick={() => setActiveTab("inventory")}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === "inventory"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_0_18px_rgba(59,130,246,0.4)] border border-white/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            <span>📦 Inventario General</span>
            <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold ${
              activeTab === "inventory" ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
            }`}>
              {items.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("map")}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === "map"
                ? "bg-gradient-to-r from-cyan-500 via-teal-500 to-blue-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.5)] border border-white/30"
                : "text-slate-400 hover:text-cyan-300 hover:bg-white/5"
            }`}
          >
            <span>🗺️ Cobertura Venezuela</span>
            <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold ${
              activeTab === "map" ? "bg-white/25 text-white" : "bg-cyan-950/80 text-cyan-400 border border-cyan-500/30"
            }`}>
              {sedes.length} Sedes
            </span>
          </button>

          <button
            onClick={() => setActiveTab("categories")}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === "categories"
                ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_18px_rgba(6,182,212,0.4)] border border-white/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            <span>🏷️ Categorías</span>
            <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold ${
              activeTab === "categories" ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
            }`}>
              {categories.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("types")}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === "types"
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_18px_rgba(147,51,234,0.4)] border border-white/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            <span>⚙️ Tipos de Artículos</span>
            <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold ${
              activeTab === "types" ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
            }`}>
              {types.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("bulk")}
            className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === "bulk"
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-[0_0_18px_rgba(16,185,129,0.4)] border border-white/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            <span>📑 Carga Masiva IA</span>
          </button>
        </nav>

        {/* ========================================================================= */}
        {/* TAB 1: INVENTARIO GENERAL */}
        {/* ========================================================================= */}
        {activeTab === "inventory" && (
          <div className="flex flex-col gap-5">
            {/* KPI Statistics Cards */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-4 sm:p-5 rounded-2xl glass-panel glass-glow-blue relative overflow-hidden group cursor-default">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Total Catálogo</p>
                  <span className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]"></span>
                </div>
                <div className="flex items-baseline justify-between mt-2 sm:mt-3">
                  <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-[0_0_12px_rgba(255,255,255,0.15)]">{stats.total_items}</h3>
                  <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-400/30 font-medium">{categories.length} cats</span>
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl glass-panel glass-glow-purple relative overflow-hidden group cursor-default">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] sm:text-xs font-bold text-purple-300 uppercase tracking-wider">Bienes Nac. (BN)</p>
                  <span className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.8)]"></span>
                </div>
                <div className="flex items-baseline justify-between mt-2 sm:mt-3">
                  <h3 className="text-2xl sm:text-3xl font-black text-purple-200 tracking-tight drop-shadow-[0_0_12px_rgba(192,132,252,0.2)]">{stats.bien_nacional_count}</h3>
                  <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-400/30 font-medium">Con BN</span>
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl glass-panel glass-glow-emerald relative overflow-hidden group cursor-default">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] sm:text-xs font-bold text-emerald-300 uppercase tracking-wider">Stock & Valor</p>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
                </div>
                <div className="flex items-baseline justify-between mt-2 sm:mt-3">
                  <h3 className="text-xl sm:text-3xl font-black text-emerald-300 tracking-tight drop-shadow-[0_0_12px_rgba(16,185,129,0.2)] truncate">${stats.total_value.toLocaleString("en-US", { minimumFractionDigits: 0 })}</h3>
                  <span className="text-[10px] sm:text-xs font-bold text-emerald-400/80">({stats.total_stock} u.)</span>
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl glass-panel glass-glow-amber relative overflow-hidden group cursor-default">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] sm:text-xs font-bold text-amber-300 uppercase tracking-wider">Stock Crítico</p>
                  <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]"></span>
                </div>
                <div className="flex items-baseline justify-between mt-2 sm:mt-3">
                  <h3 className="text-2xl sm:text-3xl font-black text-amber-300 tracking-tight drop-shadow-[0_0_12px_rgba(245,158,11,0.2)]">{stats.low_stock}</h3>
                  <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-semibold border ${stats.low_stock > 0 ? "bg-amber-500/20 text-amber-300 border-amber-400/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]" : "bg-slate-800/60 text-slate-400 border-slate-700/60"}`}>{stats.low_stock > 0 ? "Atención" : "Óptimo"}</span>
                </div>
              </div>
            </section>

            {/* Filters Bar */}
            <section className="glass-panel rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-xl">
              <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[260px]">
                <div className="relative flex-1 min-w-[200px]">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-4 h-4 text-cyan-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar Nombre, BN, SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-[#080d1a]/80 border border-slate-700/60 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_12px_rgba(56,189,248,0.25)] transition-all"
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm("")} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white text-xs">✕</button>
                  )}
                </div>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="py-2 px-3 bg-[#080d1a]/80 border border-slate-700/60 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-400 transition-all cursor-pointer"
                >
                  <option value="Todas">Categoría: Todas</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.nombre}>{cat.nombre}</option>
                  ))}
                </select>

                <select
                  value={selectedTipo}
                  onChange={(e) => setSelectedTipo(e.target.value)}
                  className="py-2 px-3 bg-[#080d1a]/80 border border-slate-700/60 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-400 transition-all cursor-pointer"
                >
                  <option value="Todos">Tipo: Todos</option>
                  {types.map((tp) => (
                    <option key={tp.id} value={tp.nombre}>{tp.nombre}</option>
                  ))}
                </select>

                <div className="flex items-center bg-[#080d1a]/80 border border-slate-700/60 rounded-xl p-0.5 text-xs">
                  <button
                    onClick={() => setStockFilter("todos")}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${stockFilter === "todos" ? "bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]" : "text-slate-400 hover:text-slate-200"}`}
                  >Todos</button>
                  <button
                    onClick={() => setStockFilter("bajo")}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${stockFilter === "bajo" ? "bg-amber-600 text-white shadow-[0_0_10px_rgba(217,119,6,0.4)]" : "text-slate-400 hover:text-slate-200"}`}
                  >Stock Bajo</button>
                </div>
              </div>

              <div className="text-[11px] sm:text-xs text-slate-400 font-medium whitespace-nowrap">
                Mostrando <span className="text-cyan-300 font-bold">{filteredItems.length}</span> de <span className="text-white font-bold">{items.length}</span>
              </div>
            </section>

            {/* Content Display: Desktop Table + Mobile Glass Cards */}
            <section className="glass-panel rounded-2xl overflow-hidden shadow-2xl flex-1 flex flex-col border border-cyan-500/20">
              
              {/* DESKTOP VIEW: Full Data Table */}
              <div className="hidden md:block overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-[#080d1a]/70 text-xs font-semibold text-slate-300 uppercase tracking-wider backdrop-blur-md">
                      <th className="py-4 px-4">Código / SKU</th>
                      <th className="py-4 px-4">Bien Nacional (BN)</th>
                      <th className="py-4 px-4">Artículo / Descripción</th>
                      <th className="py-4 px-4">Tipo & Categoría</th>
                      <th className="py-4 px-4 text-center">Stock</th>
                      <th className="py-4 px-4 text-right">Precio Unitario</th>
                      <th className="py-4 px-4 text-right">Subtotal</th>
                      <th className="py-4 px-4">Ubicación</th>
                      <th className="py-4 px-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {loading ? (
                      <tr>
                        <td colSpan={9} className="py-16 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center gap-3">
                            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-sm">Cargando catálogo institucional...</p>
                          </div>
                        </td>
                      </tr>
                    ) : filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-16 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-slate-800/50 border border-slate-700 flex items-center justify-center text-slate-400 text-xl shadow-inner">🏷️</div>
                            <p className="text-base font-semibold text-slate-200">No se encontraron artículos</p>
                            <button
                              onClick={handleOpenNewItemModal}
                              className="mt-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-[0_0_15px_rgba(37,99,235,0.3)] cursor-pointer"
                            >
                              + Registrar Primer Artículo
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item) => {
                        const isLow = item.cantidad <= 3;
                        const subtotal = item.cantidad * (item.precio_unitario || 0);

                        return (
                          <tr key={item.id} className="hover:bg-blue-500/10 transition-colors group">
                            <td className="py-3.5 px-4 font-mono text-xs text-slate-400 font-semibold whitespace-nowrap">{item.codigo || "S/C"}</td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {item.numero_bien_nacional ? (
                                <span className="px-2.5 py-1 text-xs rounded-lg bg-purple-950/80 text-purple-300 border border-purple-600/40 font-mono font-bold shadow-[0_0_8px_rgba(147,51,234,0.2)]">{item.numero_bien_nacional}</span>
                              ) : (
                                <span className="text-xs text-slate-600 italic">No asignado</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 max-w-xs">
                              <div className="font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors">{item.nombre}</div>
                              {item.descripcion && <div className="text-xs text-slate-400 truncate max-w-xs mt-0.5">{item.descripcion}</div>}
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="flex flex-col gap-1">
                                <span className="text-[11px] font-semibold text-cyan-400">{item.tipo_articulo || "Activo Fijo"}</span>
                                <span className="px-2 py-0.5 text-[11px] rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/80 w-fit font-medium">{item.categoria || "General"}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5 bg-[#080d1a]/80 border border-slate-700/60 rounded-xl p-1 shadow-inner">
                                <button
                                  onClick={() => handleAdjustStock(item.id, -1)}
                                  disabled={item.cantidad <= 0}
                                  title="Restar 1"
                                  className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                                >-</button>
                                <span className={`px-2 text-xs font-bold ${isLow ? "text-amber-400" : "text-emerald-400"}`}>{item.cantidad}</span>
                                <button
                                  onClick={() => handleAdjustStock(item.id, 1)}
                                  title="Sumar 1"
                                  className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                                >+</button>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono text-slate-300 whitespace-nowrap">${item.precio_unitario ? item.precio_unitario.toFixed(2) : "0.00"}</td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-100 whitespace-nowrap">${subtotal.toFixed(2)}</td>
                            <td className="py-3.5 px-4 text-xs text-slate-300 whitespace-nowrap">
                              {item.ubicacion ? <span className="flex items-center gap-1.5"><span className="text-cyan-400">📍</span>{item.ubicacion}</span> : <span className="text-slate-600 italic">No asignada</span>}
                            </td>
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleOpenEditItemModal(item)}
                                  title="Editar / Modificar"
                                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-blue-600/30 text-slate-300 hover:text-blue-300 border border-slate-700/60 transition-all shadow-sm cursor-pointer"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                </button>
                                <button
                                  onClick={() => handleDeleteItem(item.id, item.nombre)}
                                  title="Eliminar Artículo"
                                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-600/30 text-slate-300 hover:text-rose-400 border border-slate-700/60 transition-all shadow-sm cursor-pointer"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* MOBILE & SMARTPHONE VIEW: Touch-Optimized Glass Cards (iPhone & Android) */}
              <div className="block md:hidden p-3 divide-y divide-slate-800/60 space-y-3">
                {loading ? (
                  <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs">Cargando...</p>
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    No se encontraron registros
                  </div>
                ) : (
                  filteredItems.map((item) => {
                    const isLow = item.cantidad <= 3;
                    const subtotal = item.cantidad * (item.precio_unitario || 0);

                    return (
                      <div key={item.id} className="pt-3 first:pt-0 flex flex-col gap-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-mono text-[11px] text-slate-400 font-bold bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700">
                                {item.codigo || "S/C"}
                              </span>
                              {item.numero_bien_nacional && (
                                <span className="px-2 py-0.5 text-[11px] rounded-md bg-purple-950/80 text-purple-300 border border-purple-600/40 font-mono font-bold">
                                  {item.numero_bien_nacional}
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-slate-100 text-sm">{item.nombre}</h4>
                            {item.descripcion && (
                              <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{item.descripcion}</p>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => handleOpenEditItemModal(item)}
                              className="p-2 rounded-lg bg-slate-800 text-blue-300 border border-slate-700"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id, item.nombre)}
                              className="p-2 rounded-lg bg-slate-800 text-rose-300 border border-slate-700"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 text-xs pt-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-cyan-400">{item.tipo_articulo || "Activo Fijo"}</span>
                            <span className="text-slate-600">•</span>
                            <span className="text-[10px] text-slate-300">{item.categoria || "General"}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-300">${item.precio_unitario ? item.precio_unitario.toFixed(2) : "0.00"}</span>
                            <div className="inline-flex items-center gap-1 bg-[#080d1a] border border-slate-700/80 rounded-lg p-0.5">
                              <button
                                onClick={() => handleAdjustStock(item.id, -1)}
                                disabled={item.cantidad <= 0}
                                className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white"
                              >-</button>
                              <span className={`px-1.5 text-xs font-bold ${isLow ? "text-amber-400" : "text-emerald-400"}`}>
                                {item.cantidad}
                              </span>
                              <button
                                onClick={() => handleAdjustStock(item.id, 1)}
                                className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white"
                              >+</button>
                            </div>
                          </div>
                        </div>

                        {item.ubicacion && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1">
                            <span className="text-cyan-400">📍</span>
                            <span>{item.ubicacion}</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>
        )}

        {/* ========================================================================= */}
                {/* ========================================================================= */}
        {/* TAB 2: COBERTURA VENEZUELA & MAPA INTERACTIVO */}
        {/* ========================================================================= */}
        {activeTab === "map" && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            {/* Interactive Vector SVG Map */}
            <VenezuelaMap
              statesData={stats.states_data || {}}
              selectedState={selectedMapState}
              onSelectState={(st) => setSelectedMapState(st || null)}
            />

            {/* State Detailed View */}
            {selectedMapState ? (
              <div className="flex flex-col gap-5">
                {/* State Overview Header Card */}
                {(() => {
                  const stStats = stats.states_data?.[selectedMapState];
                  const stateSedes = sedes.filter(
                    (s) => s.estado.toLowerCase() === selectedMapState.toLowerCase()
                  );
                  const stateItems = items.filter(
                    (it) => (it.estado || "").toLowerCase() === selectedMapState.toLowerCase()
                  );
                  const totalValuation = stateItems.reduce(
                    (acc, it) => acc + it.cantidad * (it.precio_unitario || 0),
                    0
                  );
                  const totalUnits = stateItems.reduce((acc, it) => acc + it.cantidad, 0);

                  return (
                    <>
                      <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.15)] flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400 text-cyan-300 text-xs font-bold uppercase tracking-wider">
                              Estado Seleccionado
                            </span>
                            <span className="text-xs text-slate-400">República Bolivariana de Venezuela</span>
                          </div>
                          <h2 className="text-2xl sm:text-3xl font-black text-white mt-1 flex items-center gap-2">
                            📍 {selectedMapState}
                          </h2>
                          <p className="text-xs text-slate-300 mt-1">
                            Gestión centralizada de infraestructura, almacenes, galpones e inventario asignado.
                          </p>
                        </div>

                        {/* Fast Actions */}
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <button
                            onClick={() => handleOpenNewSedeModal(selectedMapState)}
                            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-[0_0_15px_rgba(6,182,212,0.35)] border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>🏢 + Registrar Galpón / Oficina</span>
                          </button>

                          <button
                            onClick={() => {
                              handleOpenNewItemModal();
                              setItemFormData((prev) => ({
                                ...prev,
                                estado: selectedMapState,
                                sede: stateSedes[0]?.nombre || "",
                              }));
                            }}
                            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-[0_0_15px_rgba(59,130,246,0.35)] border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>📦 + Cargar Ítem en {selectedMapState}</span>
                          </button>
                        </div>
                      </div>

                      {/* State KPI Cards */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        <div className="glass-panel p-4 rounded-2xl border border-cyan-500/20">
                          <p className="text-[11px] font-bold text-slate-400 uppercase">Galpones / Oficinas</p>
                          <p className="text-2xl font-black text-cyan-300 mt-1">{stateSedes.length}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">Sedes activas registradas</p>
                        </div>

                        <div className="glass-panel p-4 rounded-2xl border border-blue-500/20">
                          <p className="text-[11px] font-bold text-slate-400 uppercase">Artículos / Ítems</p>
                          <p className="text-2xl font-black text-blue-300 mt-1">{stateItems.length}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">Renglones en catálogo</p>
                        </div>

                        <div className="glass-panel p-4 rounded-2xl border border-purple-500/20">
                          <p className="text-[11px] font-bold text-slate-400 uppercase">Stock Total</p>
                          <p className="text-2xl font-black text-purple-300 mt-1">{totalUnits}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">Unidades físicas acumuladas</p>
                        </div>

                        <div className="glass-panel p-4 rounded-2xl border border-emerald-500/20">
                          <p className="text-[11px] font-bold text-slate-400 uppercase">Valoración del Estado</p>
                          <p className="text-2xl font-black text-emerald-300 mt-1 font-mono">
                            ${totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">Patrimonio en dólares USD</p>
                        </div>
                      </div>

                      {/* Section 1: Galpones & Oficinas en el Estado */}
                      <div className="glass-panel rounded-3xl p-5 border border-cyan-500/25 shadow-lg flex flex-col gap-4">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3 flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                            <h3 className="text-base sm:text-lg font-bold text-white">
                              🏢 Galpones, Oficinas y Almacenes ({stateSedes.length})
                            </h3>
                          </div>
                          <button
                            onClick={() => handleOpenNewSedeModal(selectedMapState)}
                            className="px-3 py-1.5 rounded-xl glass-panel hover:border-cyan-400/50 text-cyan-300 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                          >
                            + Nuevo Galpón
                          </button>
                        </div>

                        {stateSedes.length === 0 ? (
                          <div className="text-center py-8 px-4 rounded-2xl border border-dashed border-cyan-500/20 bg-slate-900/40">
                            <p className="text-3xl mb-2">🏢</p>
                            <p className="text-sm font-semibold text-slate-300">
                              No hay galpones u oficinas registradas en {selectedMapState}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              Comienza registrando la primera sede operativa o punto de almacenamiento en este estado.
                            </p>
                            <button
                              onClick={() => handleOpenNewSedeModal(selectedMapState)}
                              className="mt-3 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                            >
                              + Registrar Primer Galpón en {selectedMapState}
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                            {stateSedes.map((sd) => {
                              const sedeItemsCount = items.filter(
                                (it) => it.sede?.toLowerCase() === sd.nombre.toLowerCase()
                              ).length;

                              return (
                                <div
                                  key={sd.id}
                                  className="glass-panel rounded-2xl p-4 border border-cyan-500/20 hover:border-cyan-400/50 transition-all flex flex-col justify-between group shadow-sm hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                                >
                                  <div>
                                    <div className="flex items-start justify-between gap-2">
                                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 uppercase tracking-wide">
                                        {sd.tipo}
                                      </span>
                                      <span className="text-[11px] text-slate-400 font-medium">
                                        📦 {sedeItemsCount} ítems
                                      </span>
                                    </div>

                                    <h4 className="text-base font-bold text-white mt-2 group-hover:text-cyan-300 transition-colors">
                                      {sd.nombre}
                                    </h4>

                                    <div className="mt-2.5 space-y-1 text-xs text-slate-300">
                                      {sd.ciudad && (
                                        <p className="flex items-center gap-1.5 text-slate-400">
                                          <span>🏙️</span> <span>{sd.ciudad}</span>
                                        </p>
                                      )}
                                      {sd.direccion && (
                                        <p className="flex items-start gap-1.5 text-slate-400">
                                          <span>📍</span> <span className="line-clamp-2">{sd.direccion}</span>
                                        </p>
                                      )}
                                      {sd.responsable && (
                                        <p className="flex items-center gap-1.5 text-slate-300">
                                          <span>👤</span> <span>{sd.responsable}</span>
                                        </p>
                                      )}
                                      {sd.telefono && (
                                        <p className="flex items-center gap-1.5 text-slate-300">
                                          <span>📞</span> <span className="font-mono">{sd.telefono}</span>
                                        </p>
                                      )}
                                      {sd.capacidad && (
                                        <p className="flex items-center gap-1.5 text-cyan-300/80 text-[11px]">
                                          <span>📐</span> <span>Capacidad: {sd.capacidad}</span>
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-white/10">
                                    <button
                                      onClick={() => handleEditSede(sd)}
                                      className="px-2.5 py-1 rounded-lg glass-panel hover:border-cyan-400 text-cyan-300 text-xs font-semibold cursor-pointer"
                                    >
                                      Editar
                                    </button>
                                    <button
                                      onClick={() => handleDeleteSede(sd.id, sd.nombre)}
                                      className="px-2.5 py-1 rounded-lg border border-rose-500/30 hover:bg-rose-950/50 text-rose-300 text-xs font-semibold cursor-pointer"
                                    >
                                      Eliminar
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Section 2: Inventario Asignado a este Estado */}
                      <div className="glass-panel rounded-3xl p-5 border border-cyan-500/25 shadow-lg flex flex-col gap-4">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3 flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-blue-400 shadow-[0_0_8px_#60a5fa]" />
                            <h3 className="text-base sm:text-lg font-bold text-white">
                              📦 Artículos Registrados en {selectedMapState} ({stateItems.length})
                            </h3>
                          </div>
                          <button
                            onClick={() => {
                              handleOpenNewItemModal();
                              setItemFormData((prev) => ({
                                ...prev,
                                estado: selectedMapState,
                                sede: stateSedes[0]?.nombre || "",
                              }));
                            }}
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-semibold flex items-center gap-1 shadow transition-all cursor-pointer"
                          >
                            + Cargar Ítem en {selectedMapState}
                          </button>
                        </div>

                        {stateItems.length === 0 ? (
                          <div className="text-center py-8 px-4 rounded-2xl border border-dashed border-blue-500/20 bg-slate-900/40">
                            <p className="text-3xl mb-2">📦</p>
                            <p className="text-sm font-semibold text-slate-300">
                              Aún no hay artículos asignados a {selectedMapState}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              Puedes crear un nuevo artículo o editar uno existente asignándole este estado y galpón.
                            </p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto rounded-2xl border border-white/10">
                            <table className="w-full text-left text-xs text-slate-300">
                              <thead className="bg-slate-950/80 text-slate-400 uppercase font-bold border-b border-white/10">
                                <tr>
                                  <th className="p-3">Código / SKU</th>
                                  <th className="p-3">Bien Nacional</th>
                                  <th className="p-3">Nombre del Artículo</th>
                                  <th className="p-3">Galpón / Sede</th>
                                  <th className="p-3 text-center">Stock</th>
                                  <th className="p-3 text-right">Precio Unit.</th>
                                  <th className="p-3 text-right">Subtotal</th>
                                  <th className="p-3 text-center">Acciones</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5">
                                {stateItems.map((it) => (
                                  <tr key={it.id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-3 font-mono text-cyan-300 font-bold">{it.codigo || "—"}</td>
                                    <td className="p-3 font-mono text-purple-300">{it.numero_bien_nacional || "—"}</td>
                                    <td className="p-3 font-semibold text-white">{it.nombre}</td>
                                    <td className="p-3">
                                      <span className="px-2 py-0.5 rounded-md bg-cyan-950/60 border border-cyan-500/30 text-cyan-200 text-[11px]">
                                        {it.sede || "General"}
                                      </span>
                                    </td>
                                    <td className="p-3 text-center font-bold text-white">{it.cantidad}</td>
                                    <td className="p-3 text-right font-mono">${(it.precio_unitario || 0).toFixed(2)}</td>
                                    <td className="p-3 text-right font-mono text-emerald-400 font-bold">
                                      ${((it.cantidad || 0) * (it.precio_unitario || 0)).toFixed(2)}
                                    </td>
                                    <td className="p-3 text-center">
                                      <button
                                        onClick={() => handleOpenEditItemModal(it)}
                                        className="text-cyan-400 hover:text-cyan-300 hover:underline font-semibold cursor-pointer"
                                      >
                                        Editar
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : (
              <div className="text-center py-10 glass-panel rounded-3xl border border-cyan-500/20">
                <p className="text-4xl mb-2">🇻🇪</p>
                <h3 className="text-lg font-bold text-white">Selecciona un Estado en el Mapa</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Haz clic sobre cualquier estado de Venezuela para desplegar sus galpones, almacenes, oficinas y catálogo de artículos.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CATEGORÍAS */}
        {/* ========================================================================= */}
        {activeTab === "categories" && (
          <div className="flex flex-col gap-5">
            <div className="glass-panel rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 border border-cyan-500/20 shadow-xl">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></span>
                  Módulo de Gestión de Categorías
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Agrega nuevas categorías, edita sus nombres o descripciones y elimina clasificaciones.
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  onClick={() => setActiveTab("inventory")}
                  className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  title="Regresar al Inventario General"
                >
                  <span>← Volver</span>
                </button>
                <input
                  type="text"
                  placeholder="Buscar categoría..."
                  value={searchCategory}
                  onChange={(e) => setSearchCategory(e.target.value)}
                  className="px-3 py-2 bg-[#080d1a]/80 border border-slate-700/60 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-400 min-w-[150px]"
                />
                <button
                  onClick={handleOpenNewCategoryModal}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.4)] border border-white/20 transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  <span>+ Nueva Categoría</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCategories.map((cat) => {
                const colorHex = cat.color || "#3b82f6";
                return (
                  <div
                    key={cat.id}
                    className="glass-panel p-5 rounded-2xl flex flex-col justify-between gap-4 border border-white/10 hover:border-cyan-400/40 transition-all group relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 right-0 h-1 opacity-70" style={{ backgroundColor: colorHex }} />
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="w-3.5 h-3.5 rounded-lg shadow-sm" style={{ backgroundColor: colorHex }} />
                          <h3 className="font-bold text-slate-100 text-base group-hover:text-cyan-300 transition-colors">{cat.nombre}</h3>
                        </div>
                        <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-slate-800/80 text-cyan-300 border border-slate-700">
                          {cat.items_count || 0} artículos
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-2.5 line-clamp-2 min-h-[32px]">
                        {cat.descripcion || "Sin descripción proporcionada."}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs">
                      <span className="text-[11px] text-slate-500 font-mono">ID: #{cat.id}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEditCategoryModal(cat)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-blue-600/30 text-blue-300 border border-slate-700/60 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          <span>Modificar</span>
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id, cat.nombre)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-600/30 text-rose-300 border border-slate-700/60 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          <span>Eliminar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: TIPOS DE ARTÍCULOS */}
        {/* ========================================================================= */}
        {activeTab === "types" && (
          <div className="flex flex-col gap-5">
            <div className="glass-panel rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 border border-purple-500/20 shadow-xl">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.8)]"></span>
                  Clasificación y Tipos de Artículos
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Define cómo se categorizan los bienes según su naturaleza (Activo Fijo, Consumible, Mobiliario, etc.).
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  onClick={() => setActiveTab("inventory")}
                  className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  title="Regresar al Inventario General"
                >
                  <span>← Volver</span>
                </button>
                <input
                  type="text"
                  placeholder="Buscar tipo o prefijo..."
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value)}
                  className="px-3 py-2 bg-[#080d1a]/80 border border-slate-700/60 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-purple-400 min-w-[150px]"
                />
                <button
                  onClick={handleOpenNewTypeModal}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(147,51,234,0.4)] border border-white/20 transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  <span>+ Nuevo Tipo</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTypes.map((tp) => (
                <div
                  key={tp.id}
                  className="glass-panel p-5 rounded-2xl flex flex-col justify-between gap-4 border border-white/10 hover:border-purple-400/40 transition-all group relative overflow-hidden"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {tp.prefijo && (
                          <span className="px-2 py-0.5 text-xs font-mono font-black bg-purple-950/80 text-purple-300 border border-purple-600/50 rounded-md shadow-[0_0_8px_rgba(147,51,234,0.2)]">
                            {tp.prefijo}
                          </span>
                        )}
                        <h3 className="font-bold text-slate-100 text-base group-hover:text-purple-300 transition-colors">{tp.nombre}</h3>
                      </div>
                      <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-slate-800/80 text-purple-300 border border-slate-700">
                        {tp.items_count || 0} artículos
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2.5 line-clamp-3 min-h-[36px]">
                      {tp.descripcion || "Sin descripción institucional."}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs">
                    <span className="text-[11px] text-slate-500 font-mono">ID: #{tp.id}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditTypeModal(tp)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-purple-600/30 text-purple-300 border border-slate-700/60 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        <span>Modificar</span>
                      </button>
                      <button
                        onClick={() => handleDeleteType(tp.id, tp.nombre)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-600/30 text-rose-300 border border-slate-700/60 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: CARGA MASIVA IA */}
        {/* ========================================================================= */}
        {activeTab === "bulk" && (
          <div className="glass-panel rounded-3xl p-6 sm:p-8 max-w-2xl mx-auto flex flex-col gap-6 border border-cyan-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(6,182,212,0.3)] border border-cyan-500/20">
                  📑
                </div>
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight">Carga Masiva con Inteligencia Artificial</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Sube listas de inventario existentes en Excel (.xlsx), Word (.docx) o PDF.</p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab("inventory")}
                className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ml-auto"
                title="Regresar al Inventario General"
              >
                <span>← Volver</span>
              </button>
            </div>

            <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 text-xs text-slate-300 space-y-2 leading-relaxed">
              <p className="font-semibold text-cyan-300">💡 ¿Cómo procesa el sistema tus archivos?</p>
              <ul className="list-disc pl-5 space-y-1 text-slate-400">
                <li>Detecta automáticamente columnas de Número de Bien Nacional, Descripción y Cantidad.</li>
                <li>Clasifica cada ítem en las categorías y tipos de artículo correspondientes.</li>
                <li>Asegura que no se dupliquen registros con el mismo código.</li>
              </ul>
            </div>

            <form onSubmit={handleUploadSubmit} className="flex flex-col gap-4">
              <div className="border-2 border-dashed border-cyan-500/30 hover:border-cyan-400/80 rounded-2xl p-8 text-center bg-[#080d1a]/60 hover:bg-[#080d1a]/90 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer relative shadow-inner">
                <input
                  type="file"
                  accept=".xlsx,.xls,.pdf,.docx,.doc"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setUploadFile(e.target.files[0]);
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-2xl mb-1 shadow-[0_0_12px_rgba(6,182,212,0.2)] border border-cyan-500/20">
                  📂
                </div>
                <p className="text-sm font-semibold text-slate-200">{uploadFile ? uploadFile.name : "Selecciona o arrastra tu archivo aquí"}</p>
                <p className="text-xs text-slate-500">Formatos admitidos: .xlsx, .xls, .pdf, .docx</p>
              </div>

              {uploadMessage && (
                <div className="p-3 bg-blue-950/60 border border-blue-800/80 rounded-xl text-xs text-blue-300 text-center">
                  {uploadMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={uploading || !uploadFile}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm shadow-[0_0_20px_rgba(6,182,212,0.3)] border border-white/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Procesando archivo con IA...</span>
                  </>
                ) : (
                  <span>Iniciar Carga Masiva al Catálogo</span>
                )}
              </button>
            </form>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MOBILE FLOATING BOTTOM NAVIGATION BAR (iOS & Android) */}
      {/* ========================================================================= */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#060913]/90 backdrop-blur-2xl border-t border-white/10 px-2 py-2 flex items-center justify-around shadow-[0_-10px_30px_rgba(0,0,0,0.8)]">
        <button
          onClick={() => setActiveTab("inventory")}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            activeTab === "inventory" ? "text-cyan-400 font-bold scale-105" : "text-slate-400"
          }`}
        >
          <span className="text-lg">📦</span>
          <span className="text-[10px]">Inventario</span>
        </button>

        <button
          onClick={() => setActiveTab("map")}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            activeTab === "map" ? "text-cyan-300 font-bold scale-105" : "text-slate-400"
          }`}
        >
          <span className="text-lg">🗺️</span>
          <span className="text-[10px]">Venezuela</span>
        </button>

        <button
          onClick={() => setActiveTab("categories")}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            activeTab === "categories" ? "text-cyan-400 font-bold scale-105" : "text-slate-400"
          }`}
        >
          <span className="text-lg">🏷️</span>
          <span className="text-[10px]">Categorías</span>
        </button>

        <button
          onClick={handleOpenNewItemModal}
          className="w-11 h-11 -mt-5 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white text-xl shadow-[0_0_20px_rgba(6,182,212,0.5)] border border-white/30 active:scale-95 transition-transform cursor-pointer"
          title="Agregar Ítem"
        >
          +
        </button>

        <button
          onClick={() => setActiveTab("types")}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            activeTab === "types" ? "text-purple-400 font-bold scale-105" : "text-slate-400"
          }`}
        >
          <span className="text-lg">⚙️</span>
          <span className="text-[10px]">Tipos</span>
        </button>

        <button
          onClick={() => setActiveTab("bulk")}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            activeTab === "bulk" ? "text-emerald-400 font-bold scale-105" : "text-slate-400"
          }`}
        >
          <span className="text-lg">📑</span>
          <span className="text-[10px]">Carga IA</span>
        </button>
      </nav>

      {/* ========================================================================= */}
      {/* MODAL: INSTRUCCIONES DE INSTALACIÓN IPHONE (iOS Safari) */}
      {/* ========================================================================= */}
      {isIosModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="glass-panel rounded-3xl w-full max-w-sm p-6 relative flex flex-col gap-4 border border-cyan-500/30 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-2xl mx-auto border border-cyan-500/30">
              🍎
            </div>
            <h3 className="text-lg font-bold text-white">Instalar en iPhone / iPad</h3>
            <div className="text-xs text-slate-300 space-y-3 text-left bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
              <p className="flex items-start gap-2">
                <span className="font-bold text-cyan-400">1.</span>
                <span>Toca el botón <strong>Compartir</strong> (icono <span className="text-base">⎋</span>) en la barra inferior de Safari.</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="font-bold text-cyan-400">2.</span>
                <span>Desplázate hacia abajo y pulsa <strong>"Añadir a pantalla de inicio"</strong> (<span className="text-base">➕</span>).</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="font-bold text-cyan-400">3.</span>
                <span>Pulsa <strong>"Añadir"</strong> en la esquina superior derecha.</span>
              </p>
            </div>
            <button
              onClick={() => setIsIosModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REGISTRAR / MODIFICAR ÍTEM */}
      {/* ========================================================================= */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in overflow-y-auto">
          <div className="glass-panel rounded-3xl w-full max-w-xl p-6 relative flex flex-col gap-4 my-8 border border-cyan-500/30 shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_25px_rgba(56,189,248,0.15)]">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></span>
                {editingItem ? `Modificar Ítem: ${editingItem.nombre}` : "Registrar Artículo / Bien Nacional"}
              </h3>
              <button onClick={() => setIsItemModalOpen(false)} className="text-slate-400 hover:text-white text-lg p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveItem} className="flex flex-col gap-3.5 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Código Interno / SKU</label>
                  <input
                    type="text"
                    value={itemFormData.codigo}
                    onChange={(e) => setItemFormData({ ...itemFormData, codigo: e.target.value })}
                    placeholder="Ej. SRV-001"
                    className="w-full px-3 py-2 bg-[#080d1a]/80 border border-slate-700/80 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-400 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-purple-400 mb-1">N° de Bien Nacional (BN)</label>
                  <input
                    type="text"
                    value={itemFormData.numero_bien_nacional}
                    onChange={(e) => setItemFormData({ ...itemFormData, numero_bien_nacional: e.target.value })}
                    placeholder="Ej. BN-2024-00412"
                    className="w-full px-3 py-2 bg-[#080d1a]/80 border border-purple-700/60 rounded-xl text-purple-200 placeholder-purple-900/60 focus:outline-none focus:border-purple-400 font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre del Artículo / Equipo *</label>
                <input
                  type="text"
                  required
                  value={itemFormData.nombre}
                  onChange={(e) => setItemFormData({ ...itemFormData, nombre: e.target.value })}
                  placeholder="Ej. Servidor Dell PowerEdge R750"
                  className="w-full px-3 py-2 bg-[#080d1a]/80 border border-slate-700/80 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-cyan-400">Tipo de Artículo</label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsItemModalOpen(false);
                        handleOpenNewTypeModal();
                      }}
                      className="text-[10px] text-purple-400 hover:text-purple-300 hover:underline cursor-pointer"
                    >
                      + Crear Tipo
                    </button>
                  </div>
                  <select
                    value={itemFormData.tipo_articulo}
                    onChange={(e) => setItemFormData({ ...itemFormData, tipo_articulo: e.target.value })}
                    className="w-full px-3 py-2 bg-[#080d1a]/80 border border-slate-700/80 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-400 text-xs cursor-pointer"
                  >
                    {types.map((tp) => (
                      <option key={tp.id} value={tp.nombre}>{tp.nombre} {tp.prefijo ? `(${tp.prefijo})` : ""}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-400">Categoría</label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsItemModalOpen(false);
                        handleOpenNewCategoryModal();
                      }}
                      className="text-[10px] text-blue-400 hover:text-blue-300 hover:underline cursor-pointer"
                    >
                      + Crear Categoría
                    </button>
                  </div>
                  <select
                    value={itemFormData.categoria}
                    onChange={(e) => setItemFormData({ ...itemFormData, categoria: e.target.value })}
                    className="w-full px-3 py-2 bg-[#080d1a]/80 border border-slate-700/80 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-400 text-xs cursor-pointer"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.nombre}>{cat.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Cantidad en Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={itemFormData.cantidad}
                    onChange={(e) => setItemFormData({ ...itemFormData, cantidad: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-[#080d1a]/80 border border-slate-700/80 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Precio Unitario ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={itemFormData.precio_unitario}
                    onChange={(e) => setItemFormData({ ...itemFormData, precio_unitario: parseFloat(e.target.value) || 0.0 })}
                    className="w-full px-3 py-2 bg-[#080d1a]/80 border border-slate-700/80 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-cyan-400 mb-1">Estado de Venezuela</label>
                  <select
                    value={itemFormData.estado}
                    onChange={(e) => setItemFormData({ ...itemFormData, estado: e.target.value })}
                    className="w-full px-3 py-2 bg-[#080d1a]/80 border border-slate-700/80 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-400 text-xs cursor-pointer"
                  >
                    {VENEZUELA_STATES_PATHS.map((st) => (
                      <option key={st.id} value={st.title}>{st.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-cyan-400 mb-1">Galpón / Sede</label>
                  <select
                    value={itemFormData.sede}
                    onChange={(e) => setItemFormData({ ...itemFormData, sede: e.target.value })}
                    className="w-full px-3 py-2 bg-[#080d1a]/80 border border-slate-700/80 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-400 text-xs cursor-pointer"
                  >
                    <option value="">-- Sin Galpón Específico --</option>
                    {sedes
                      .filter((s) => !itemFormData.estado || s.estado.toLowerCase() === itemFormData.estado.toLowerCase())
                      .map((s) => (
                        <option key={s.id} value={s.nombre}>{s.nombre} ({s.tipo})</option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Ubicación Física Interna (Rack, Pasillo, etc.)</label>
                <input
                  type="text"
                  value={itemFormData.ubicacion}
                  onChange={(e) => setItemFormData({ ...itemFormData, ubicacion: e.target.value })}
                  placeholder="Ej. Pasillo 3, Estante B, Nivel 2"
                  className="w-full px-3 py-2 bg-[#080d1a]/80 border border-slate-700/80 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-400 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Descripción Técnica / Seriales</label>
                <textarea
                  rows={2}
                  value={itemFormData.descripcion}
                  onChange={(e) => setItemFormData({ ...itemFormData, descripcion: e.target.value })}
                  placeholder="Marca, modelo, número de serie o condiciones del bien..."
                  className="w-full px-3 py-2 bg-[#080d1a]/80 border border-slate-700/80 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-400"
                />
              </div>

              {formError && (
                <div className="p-3 bg-rose-950/80 border border-rose-600/80 rounded-xl text-xs text-rose-300 font-medium">⚠ {formError}</div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-4 py-2 rounded-xl glass-panel hover:bg-slate-800 text-slate-300 font-medium text-xs transition-colors cursor-pointer"
                >Cancelar</button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-50 text-white font-bold text-xs shadow-[0_0_18px_rgba(59,130,246,0.4)] border border-white/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>{editingItem ? "✓ Guardar Modificaciones" : "✓ Registrar Ítem"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREAR / MODIFICAR CATEGORÍA */}
      {/* ========================================================================= */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="glass-panel rounded-3xl w-full max-w-md p-6 relative flex flex-col gap-4 border border-cyan-500/30 shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_25px_rgba(56,189,248,0.15)]">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></span>
                {editingCategory ? `Modificar Categoría: ${editingCategory.nombre}` : "Nueva Categoría"}
              </h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-slate-400 hover:text-white text-lg p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveCategory} className="flex flex-col gap-3.5 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre de la Categoría *</label>
                <input
                  type="text"
                  required
                  value={categoryFormData.nombre}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, nombre: e.target.value })}
                  placeholder="Ej. Servidores, Redes, Mobiliario..."
                  className="w-full px-3 py-2 bg-[#080d1a]/80 border border-slate-700/80 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Descripción</label>
                <textarea
                  rows={2}
                  value={categoryFormData.descripcion}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, descripcion: e.target.value })}
                  placeholder="Finalidad o tipos de equipos incluidos..."
                  className="w-full px-3 py-2 bg-[#080d1a]/80 border border-slate-700/80 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Color Identificador</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {COLOR_PRESETS.map((col) => (
                    <button
                      key={col.value}
                      type="button"
                      onClick={() => setCategoryFormData({ ...categoryFormData, color: col.value })}
                      className={`w-7 h-7 rounded-xl transition-all cursor-pointer flex items-center justify-center border ${
                        categoryFormData.color === col.value
                          ? "scale-110 border-white shadow-[0_0_10px_rgba(255,255,255,0.4)]"
                          : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: col.value }}
                      title={col.name}
                    >
                      {categoryFormData.color === col.value && <span className="text-white text-xs font-bold">✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              {formError && (
                <div className="p-3 bg-rose-950/80 border border-rose-600/80 rounded-xl text-xs text-rose-300 font-medium">⚠ {formError}</div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl glass-panel hover:bg-slate-800 text-slate-300 font-medium text-xs transition-colors cursor-pointer"
                >Cancelar</button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-xs shadow-[0_0_15px_rgba(6,182,212,0.4)] border border-white/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>{editingCategory ? "✓ Guardar Categoría" : "✓ Crear Categoría"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREAR / MODIFICAR TIPO DE ARTÍCULO */}
      {/* ========================================================================= */}
      {isTypeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="glass-panel rounded-3xl w-full max-w-md p-6 relative flex flex-col gap-4 border border-purple-500/30 shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_25px_rgba(147,51,234,0.15)]">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.8)]"></span>
                {editingType ? `Modificar Tipo: ${editingType.nombre}` : "Nuevo Tipo de Artículo"}
              </h3>
              <button onClick={() => setIsTypeModalOpen(false)} className="text-slate-400 hover:text-white text-lg p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveType} className="flex flex-col gap-3.5 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre del Tipo *</label>
                <input
                  type="text"
                  required
                  value={typeFormData.nombre}
                  onChange={(e) => setTypeFormData({ ...typeFormData, nombre: e.target.value })}
                  placeholder="Ej. Activo Fijo, Consumible, Mobiliario..."
                  className="w-full px-3 py-2 bg-[#080d1a]/80 border border-slate-700/80 rounded-xl text-slate-100 focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-purple-400 mb-1">Prefijo de Código (Opcional)</label>
                <input
                  type="text"
                  value={typeFormData.prefijo}
                  onChange={(e) => setTypeFormData({ ...typeFormData, prefijo: e.target.value.toUpperCase() })}
                  placeholder="Ej. BN, EQ, MOB, CON"
                  maxLength={6}
                  className="w-full px-3 py-2 bg-[#080d1a]/80 border border-purple-700/60 rounded-xl text-purple-200 focus:outline-none focus:border-purple-400 font-mono text-xs uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Descripción Institucional</label>
                <textarea
                  rows={2}
                  value={typeFormData.descripcion}
                  onChange={(e) => setTypeFormData({ ...typeFormData, descripcion: e.target.value })}
                  placeholder="Indica las directrices o normativas de este tipo de bien..."
                  className="w-full px-3 py-2 bg-[#080d1a]/80 border border-slate-700/80 rounded-xl text-slate-100 focus:outline-none focus:border-purple-400"
                />
              </div>

              {formError && (
                <div className="p-3 bg-rose-950/80 border border-rose-600/80 rounded-xl text-xs text-rose-300 font-medium">⚠ {formError}</div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsTypeModalOpen(false)}
                  className="px-4 py-2 rounded-xl glass-panel hover:bg-slate-800 text-slate-300 font-medium text-xs transition-colors cursor-pointer"
                >Cancelar</button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-[0_0_15px_rgba(147,51,234,0.4)] border border-white/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>{editingType ? "✓ Guardar Tipo" : "✓ Crear Tipo"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CARGA MASIVA IA */}
      {/* ========================================================================= */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div className="glass-panel rounded-3xl w-full max-w-lg shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_25px_rgba(56,189,248,0.15)] p-6 relative flex flex-col gap-4 border border-cyan-500/30">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                Carga Masiva con Inteligencia Artificial
              </h3>
              <button onClick={() => setIsBulkModalOpen(false)} className="text-slate-400 hover:text-white text-lg p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">✕</button>
            </div>

            <p className="text-xs text-slate-300">
              Adjunta una hoja de cálculo (Excel), documento Word o PDF. El motor de IA clasificará cada renglón, detectará si posee Bien Nacional o SKU, y lo registrará en la base de datos.
            </p>

            <form onSubmit={handleUploadSubmit} className="flex flex-col gap-4">
              <div className="border-2 border-dashed border-cyan-500/30 hover:border-cyan-400/80 rounded-2xl p-8 text-center bg-[#080d1a]/60 hover:bg-[#080d1a]/90 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer relative shadow-inner">
                <input
                  type="file"
                  accept=".xlsx,.xls,.pdf,.docx,.doc"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setUploadFile(e.target.files[0]);
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-2xl mb-1 shadow-[0_0_12px_rgba(6,182,212,0.2)] border border-cyan-500/20">
                  📂
                </div>
                <p className="text-sm font-semibold text-slate-200">{uploadFile ? uploadFile.name : "Selecciona o arrastra tu archivo aquí"}</p>
                <p className="text-xs text-slate-500">Formatos admitidos: .xlsx, .xls, .pdf, .docx</p>
              </div>

              {uploadMessage && (
                <div className="p-3 bg-blue-950/60 border border-blue-800/80 rounded-xl text-xs text-blue-300 text-center">
                  {uploadMessage}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="px-4 py-2 rounded-xl glass-panel hover:bg-slate-800 text-slate-300 font-medium text-xs transition-colors cursor-pointer"
                >Cerrar</button>
                <button
                  type="submit"
                  disabled={uploading || !uploadFile}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs shadow-[0_0_15px_rgba(6,182,212,0.3)] border border-white/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  {uploading ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Procesando archivo...</span>
                    </>
                  ) : (
                    <span>Iniciar Carga Masiva</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
