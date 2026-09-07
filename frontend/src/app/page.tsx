"use client";

import React, { useState, useEffect, useMemo } from "react";

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
  fecha_creacion?: string;
  fecha_actualizacion?: string;
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
}

const DEFAULT_TIPOS = [
  "Activo Fijo",
  "Equipo Tecnológico",
  "Mobiliario",
  "Consumible",
  "Herramienta",
  "Redes y Telecom",
  "Material de Oficina",
];

export default function Dashboard() {
  const [items, setItems] = useState<Item[]>([]);
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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [selectedTipo, setSelectedTipo] = useState("Todos");
  const [stockFilter, setStockFilter] = useState<"todos" | "bajo" | "ok">("todos");

  // Modals
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    codigo: "",
    numero_bien_nacional: "",
    tipo_articulo: "Activo Fijo",
    nombre: "",
    descripcion: "",
    categoria: "General",
    cantidad: 1,
    precio_unitario: 0.0,
    ubicacion: "",
  });

  const [customCategory, setCustomCategory] = useState("");
  const [customTipo, setCustomTipo] = useState("");

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

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

  // Fetch Data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [resItems, resStats] = await Promise.all([
        fetch(`${API_URL}/items`),
        fetch(`${API_URL}/stats`),
      ]);

      if (resItems.ok) {
        const dataItems = await resItems.json();
        setItems(dataItems);
      }
      if (resStats.ok) {
        const dataStats = await resStats.json();
        setStats(dataStats);
      }
    } catch (err) {
      console.error("Error al conectar con la API:", err);
      showToast("Error de conexión con el backend", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered items
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

  // Open Modal for New Item
  const handleOpenNewModal = () => {
    setEditingItem(null);
    setFormData({
      codigo: `ITM-${Math.floor(1000 + Math.random() * 9000)}`,
      numero_bien_nacional: `BN-${Math.floor(100000 + Math.random() * 900000)}`,
      tipo_articulo: "Activo Fijo",
      nombre: "",
      descripcion: "",
      categoria: stats.categories[0] || "General",
      cantidad: 1,
      precio_unitario: 0.0,
      ubicacion: "",
    });
    setCustomCategory("");
    setCustomTipo("");
    setIsItemModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEditModal = (item: Item) => {
    setEditingItem(item);
    setFormData({
      codigo: item.codigo || "",
      numero_bien_nacional: item.numero_bien_nacional || "",
      tipo_articulo: item.tipo_articulo || "Activo Fijo",
      nombre: item.nombre,
      descripcion: item.descripcion || "",
      categoria: item.categoria || "General",
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      ubicacion: item.ubicacion || "",
    });
    setCustomCategory("");
    setCustomTipo("");
    setIsItemModalOpen(true);
  };

  // Submit Save/Update
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      showToast("El nombre del artículo es obligatorio", "error");
      return;
    }

    const payload = {
      ...formData,
      categoria: customCategory.trim() ? customCategory.trim() : formData.categoria,
      tipo_articulo: customTipo.trim() ? customTipo.trim() : formData.tipo_articulo,
    };

    try {
      if (editingItem) {
        // Update
        const res = await fetch(`${API_URL}/items/${editingItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          showToast(`Ítem '${payload.nombre}' actualizado correctamente`);
          setIsItemModalOpen(false);
          fetchData();
        } else {
          showToast("Error al actualizar ítem", "error");
        }
      } else {
        // Create
        const res = await fetch(`${API_URL}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          showToast(`Ítem '${payload.nombre}' registrado con éxito`);
          setIsItemModalOpen(false);
          fetchData();
        } else {
          showToast("Error al guardar ítem", "error");
        }
      }
    } catch (err) {
      showToast("Error de conexión al guardar", "error");
    }
  };

  // Quick Stock Adjust (+1, -1)
  const handleAdjustStock = async (id: number, delta: number) => {
    try {
      const res = await fetch(`${API_URL}/items/${id}/stock?delta=${delta}`, {
        method: "PATCH",
      });
      if (res.ok) {
        const updated = await res.json();
        setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
        fetch(`${API_URL}/stats`)
          .then((r) => r.json())
          .then(setStats)
          .catch(() => {});
      }
    } catch (err) {
      showToast("No se pudo ajustar el stock", "error");
    }
  };

  // Delete Item
  const handleDeleteItem = async (id: number, nombre: string) => {
    if (!confirm(`¿Confirmas eliminar permanentemente el ítem '${nombre}'?`)) return;
    try {
      const res = await fetch(`${API_URL}/items/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Ítem eliminado correctamente");
        fetchData();
      } else {
        showToast("Error al eliminar", "error");
      }
    } catch (err) {
      showToast("Error de conexión al eliminar", "error");
    }
  };

  // Bulk Upload Handler
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
    <div className="min-h-screen text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 backdrop-blur-xl ${
            toast.type === "success"
              ? "bg-emerald-950/80 text-emerald-200 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.25)]"
              : "bg-rose-950/80 text-rose-200 border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.25)]"
          }`}
        >
          <span className="text-lg">{toast.type === "success" ? "✓" : "⚠"}</span>
          <span className="font-medium text-sm">{toast.message}</span>
        </div>
      )}

      {/* Top Navigation Bar with Glass Bevel */}
      <header className="glass-panel sticky top-0 z-40 px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 rounded-b-2xl mx-2 mt-1 shadow-[0_10px_30px_rgba(0,0,0,0.5),0_0_20px_rgba(56,189,248,0.1)]">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.4)] border border-white/30 font-black text-xl text-white">
            OD
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.2)]">
                ODINVENTARIO
              </h1>
              <span className="px-2.5 py-0.5 text-[11px] font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-400/30 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                Bienes Nacionales & Gestión Omni-Stack
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse"></span>
              Servidor Activo • 192.168.100.2:8088
            </p>
          </div>
        </div>

        {/* Global Quick Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            title="Refrescar datos"
            className="p-2.5 rounded-xl glass-panel hover:border-cyan-400/40 text-slate-300 hover:text-white transition-all shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="px-4 py-2.5 rounded-xl glass-panel hover:border-cyan-400/50 text-slate-200 font-medium text-sm flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(6,182,212,0.12)] hover:shadow-[0_0_20px_rgba(6,182,212,0.25)]"
          >
            <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span>Carga Masiva IA</span>
          </button>

          <button
            onClick={handleOpenNewModal}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.4)] border border-white/25 transition-all active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>+ Agregar Ítem</span>
          </button>
        </div>
      </header>

      <main className="p-6 max-w-7xl w-full mx-auto flex-1 flex flex-col gap-6">
        {/* KPI Statistics Cards - Glassmorphism & Subtle Neon Glow */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Catálogo */}
          <div className="p-5 rounded-2xl glass-panel glass-glow-blue relative overflow-hidden group cursor-default">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Catálogo
              </p>
              <span className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]"></span>
            </div>
            <div className="flex items-baseline justify-between mt-3">
              <h3 className="text-3xl font-black text-white tracking-tight drop-shadow-[0_0_12px_rgba(255,255,255,0.15)]">
                {stats.total_items}
              </h3>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-400/30 font-medium">
                {stats.categories_count} categorías
              </span>
            </div>
          </div>

          {/* Card 2: Bienes Nacionales */}
          <div className="p-5 rounded-2xl glass-panel glass-glow-purple relative overflow-hidden group cursor-default">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                Bienes Nacionales (BN)
              </p>
              <span className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.8)]"></span>
            </div>
            <div className="flex items-baseline justify-between mt-3">
              <h3 className="text-3xl font-black text-purple-200 tracking-tight drop-shadow-[0_0_12px_rgba(192,132,252,0.2)]">
                {stats.bien_nacional_count}
              </h3>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-400/30 font-medium">
                Identificados
              </span>
            </div>
          </div>

          {/* Card 3: Stock & Valoración */}
          <div className="p-5 rounded-2xl glass-panel glass-glow-emerald relative overflow-hidden group cursor-default">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                Stock ({stats.total_stock} uds) • Valor
              </p>
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
            </div>
            <div className="flex items-baseline justify-between mt-3">
              <h3 className="text-3xl font-black text-emerald-300 tracking-tight drop-shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                ${stats.total_value.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </h3>
              <span className="text-xs font-bold text-emerald-400/80">USD</span>
            </div>
          </div>

          {/* Card 4: Low Stock Alert */}
          <div className="p-5 rounded-2xl glass-panel glass-glow-amber relative overflow-hidden group cursor-default">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                Stock Crítico (≤ 3)
              </p>
              <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]"></span>
            </div>
            <div className="flex items-baseline justify-between mt-3">
              <h3 className="text-3xl font-black text-amber-300 tracking-tight drop-shadow-[0_0_12px_rgba(245,158,11,0.2)]">
                {stats.low_stock}
              </h3>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                  stats.low_stock > 0
                    ? "bg-amber-500/20 text-amber-300 border-amber-400/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                    : "bg-slate-800/60 text-slate-400 border-slate-700/60"
                }`}
              >
                {stats.low_stock > 0 ? "Atención Requerida" : "Óptimo"}
              </span>
            </div>
          </div>
        </section>

        {/* Control and Filter Bar - Glass Beveled */}
        <section className="glass-panel rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[220px]">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4 text-cyan-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Buscar por Nombre, N° Bien Nacional, SKU, Categoría..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#080d1a]/80 border border-slate-700/60 rounded-xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_12px_rgba(56,189,248,0.25)] transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="py-2 px-3.5 bg-[#080d1a]/80 border border-slate-700/60 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-cyan-400 transition-all cursor-pointer"
            >
              <option value="Todas">Categoría: Todas</option>
              {stats.categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Tipo de Artículo Filter */}
            <select
              value={selectedTipo}
              onChange={(e) => setSelectedTipo(e.target.value)}
              className="py-2 px-3.5 bg-[#080d1a]/80 border border-slate-700/60 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-cyan-400 transition-all cursor-pointer"
            >
              <option value="Todos">Tipo: Todos</option>
              {DEFAULT_TIPOS.map((tp) => (
                <option key={tp} value={tp}>
                  {tp}
                </option>
              ))}
            </select>

            {/* Stock Level Filter Tabs */}
            <div className="flex items-center bg-[#080d1a]/80 border border-slate-700/60 rounded-xl p-1 text-xs">
              <button
                onClick={() => setStockFilter("todos")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  stockFilter === "todos"
                    ? "bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setStockFilter("bajo")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  stockFilter === "bajo"
                    ? "bg-amber-600 text-white shadow-[0_0_10px_rgba(217,119,6,0.4)]"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Stock Bajo
              </button>
              <button
                onClick={() => setStockFilter("ok")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  stockFilter === "ok"
                    ? "bg-emerald-600 text-white shadow-[0_0_10px_rgba(5,150,105,0.4)]"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                En Regla
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-400 font-medium whitespace-nowrap">
            Mostrando <span className="text-cyan-300 font-bold">{filteredItems.length}</span> de{" "}
            <span className="text-white font-bold">{items.length}</span> registros
          </div>
        </section>

        {/* Main Data Table - Glass Beveled */}
        <section className="glass-panel rounded-2xl overflow-hidden shadow-2xl flex-1 flex flex-col border border-cyan-500/20">
          <div className="overflow-x-auto flex-1">
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
                        <div className="w-12 h-12 rounded-2xl bg-slate-800/50 border border-slate-700 flex items-center justify-center text-slate-400 text-xl shadow-inner">
                          🏷️
                        </div>
                        <p className="text-base font-semibold text-slate-200">
                          No se encontraron artículos
                        </p>
                        <p className="text-xs text-slate-500 max-w-sm">
                          No hay registros que coincidan con los filtros actuales.
                        </p>
                        <button
                          onClick={handleOpenNewModal}
                          className="mt-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-[0_0_15px_rgba(37,99,235,0.3)]"
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
                      <tr
                        key={item.id}
                        className="hover:bg-blue-500/10 transition-colors group"
                      >
                        {/* SKU */}
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-400 font-semibold whitespace-nowrap">
                          {item.codigo || "S/C"}
                        </td>

                        {/* Bien Nacional */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {item.numero_bien_nacional ? (
                            <span className="px-2.5 py-1 text-xs rounded-lg bg-purple-950/80 text-purple-300 border border-purple-600/40 font-mono font-bold shadow-[0_0_8px_rgba(147,51,234,0.2)]">
                              {item.numero_bien_nacional}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-600 italic">No asignado</span>
                          )}
                        </td>

                        {/* Nombre & Descripción */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors">
                            {item.nombre}
                          </div>
                          {item.descripcion && (
                            <div className="text-xs text-slate-400 truncate max-w-xs mt-0.5">
                              {item.descripcion}
                            </div>
                          )}
                        </td>

                        {/* Tipo & Categoría */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-semibold text-cyan-400">
                              {item.tipo_articulo || "Activo Fijo"}
                            </span>
                            <span className="px-2 py-0.5 text-[11px] rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/80 w-fit font-medium">
                              {item.categoria || "General"}
                            </span>
                          </div>
                        </td>

                        {/* Stock Controls */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 bg-[#080d1a]/80 border border-slate-700/60 rounded-xl p-1 shadow-inner">
                            <button
                              onClick={() => handleAdjustStock(item.id, -1)}
                              disabled={item.cantidad <= 0}
                              title="Restar 1"
                              className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                              -
                            </button>
                            <span
                              className={`px-2 text-xs font-bold ${
                                isLow ? "text-amber-400" : "text-emerald-400"
                              }`}
                            >
                              {item.cantidad}
                            </span>
                            <button
                              onClick={() => handleAdjustStock(item.id, 1)}
                              title="Sumar 1"
                              className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                            >
                              +
                            </button>
                          </div>
                        </td>

                        {/* Precio Unitario */}
                        <td className="py-3.5 px-4 text-right font-mono text-slate-300 whitespace-nowrap">
                          ${item.precio_unitario ? item.precio_unitario.toFixed(2) : "0.00"}
                        </td>

                        {/* Subtotal */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-100 whitespace-nowrap">
                          ${subtotal.toFixed(2)}
                        </td>

                        {/* Ubicación */}
                        <td className="py-3.5 px-4 text-xs text-slate-300 whitespace-nowrap">
                          {item.ubicacion ? (
                            <span className="flex items-center gap-1.5">
                              <span className="text-cyan-400">📍</span>
                              {item.ubicacion}
                            </span>
                          ) : (
                            <span className="text-slate-600 italic">No asignada</span>
                          )}
                        </td>

                        {/* Acciones */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              title="Editar / Modificar"
                              className="p-2 rounded-xl bg-slate-800/80 hover:bg-blue-600/30 text-slate-300 hover:text-blue-300 border border-slate-700/60 transition-all shadow-sm"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id, item.nombre)}
                              title="Eliminar Artículo"
                              className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-600/30 text-slate-300 hover:text-rose-400 border border-slate-700/60 transition-all shadow-sm"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
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
        </section>
      </main>

      {/* MODAL: Crear / Modificar Ítem con Glass Bevel */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in overflow-y-auto">
          <div className="glass-panel rounded-3xl w-full max-w-xl p-6 relative flex flex-col gap-4 my-8 border border-cyan-500/30 shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_25px_rgba(56,189,248,0.15)]">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></span>
                {editingItem ? `Modificar: ${editingItem.nombre}` : "Registrar Artículo / Bien Nacional"}
              </h3>
              <button
                onClick={() => setIsItemModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="flex flex-col gap-3.5 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Código Interno / SKU
                  </label>
                  <input
                    type="text"
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    placeholder="Ej. SRV-001"
                    className="w-full px-3 py-2 bg-[#080d1a]/80 border border-slate-700/80 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-400 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-purple-400 mb-1">
                    N° de Bien Nacional (BN)
                  </label>
                  <input
                    type="text"
                    value={formData.numero_bien_nacional}
                    onChange={(e) => setFormData({ ...formData, numero_bien_nacional: e.target.value })}
                    placeholder="Ej. BN-2024-00412"
                    className="w-full px-3 py-2 bg-[#080d1a]/80 border border-purple-700/60 rounded-xl text-purple-200 placeholder-purple-900/60 focus:outline-none focus:border-purple-400 font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Nombre del Artículo / Equipo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej. Computadora de Escritorio Dell OptiPlex 7090"
                  className="w-full px-3 py-2 bg-[#080d1a]/80 border border-slate-700/80 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Tipo de Artículo & Categoría Dinámica */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-cyan-400 mb-1">
                    Tipo de Artículo
                  </label>
                  <select
                    value={formData.tipo_articulo}
                    onChange={(e) => setFormData({ ...formData, tipo_articulo: e.target.value })}
                    className="w-full px-3 py-2 bg-[#080d1a]/80 border border-slate-700/80 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-400 text-xs mb-1.5 cursor-pointer"
                  >
                    {DEFAULT_TIPOS.map((tp) => (
                      <option key={tp} value={tp}>
                        {tp}
                      </option>
                    ))}
                    <option value="Otro">Otro (personalizado)...</option>
                  </select>
                  {formData.tipo_articulo === "Otro" && (
                    <input
                      type="text"
                      placeholder="Escribe nuevo tipo..."
                      value={customTipo}
                      onChange={(e) => setCustomTipo(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#050812] border border-cyan-500/80 rounded-lg text-xs text-cyan-200"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Categoría
                  </label>
                  <select
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    className="w-full px-3 py-2 bg-[#080d1a]/80 border border-slate-700/80 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-400 text-xs mb-1.5 cursor-pointer"
                  >
                    {stats.categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="+ Nueva">+ Agregar Nueva Categoría...</option>
                  </select>
                  {formData.categoria === "+ Nueva" && (
                    <input
                      type="text"
                      placeholder="Nombre de la nueva categoría..."
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#050812] border border-blue-500/80 rounded-lg text-xs text-blue-200"
                    />
                  )}
                </div>
              </div>

              {/* Cantidad y Precio */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Cantidad Física en Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.cantidad}
                    onChange={(e) => setFormData({ ...formData, cantidad: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-[#080d1a]/80 border border-slate-700/80 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Precio Unitario ($ USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.precio_unitario}
                    onChange={(e) => setFormData({ ...formData, precio_unitario: parseFloat(e.target.value) || 0.0 })}
                    className="w-full px-3 py-2 bg-[#080d1a]/80 border border-slate-700/80 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Ubicación Física (Departamento, Almacén, Estante)
                </label>
                <input
                  type="text"
                  value={formData.ubicacion}
                  onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
                  placeholder="Ej. Gerencia de Sistemas - Oficina 204"
                  className="w-full px-3 py-2 bg-[#080d1a]/80 border border-slate-700/80 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Descripción Técnica, Seriales o Especificaciones
                </label>
                <textarea
                  rows={2}
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Marca, modelo, número de serie o condiciones del bien..."
                  className="w-full px-3 py-2 bg-[#080d1a]/80 border border-slate-700/80 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-4 py-2 rounded-xl glass-panel hover:bg-slate-800 text-slate-300 font-medium text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold text-xs shadow-[0_0_15px_rgba(59,130,246,0.4)] border border-white/20 transition-all"
                >
                  {editingItem ? "Guardar Modificaciones" : "Registrar Artículo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Carga Masiva con Glass Bevel */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div className="glass-panel rounded-3xl w-full max-w-lg shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_25px_rgba(56,189,248,0.15)] p-6 relative flex flex-col gap-4 border border-cyan-500/30">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                Carga Masiva con Inteligencia Artificial
              </h3>
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Adjunta una hoja de cálculo (Excel), documento Word o PDF. El motor de IA clasificará cada artículo, detectará si posee Bien Nacional o SKU, y lo ubicará automáticamente en el catálogo.
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
                  📑
                </div>
                <p className="text-sm font-semibold text-slate-200">
                  {uploadFile ? uploadFile.name : "Selecciona o arrastra tu archivo aquí"}
                </p>
                <p className="text-xs text-slate-500">
                  Formatos admitidos: .xlsx, .xls, .pdf, .docx
                </p>
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
                  className="px-4 py-2 rounded-xl glass-panel hover:bg-slate-800 text-slate-300 font-medium text-xs transition-colors"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadFile}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs shadow-[0_0_15px_rgba(6,182,212,0.3)] border border-white/20 transition-all flex items-center gap-2"
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
