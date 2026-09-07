"use client";

import React, { useState, useEffect, useMemo } from "react";

interface Item {
  id: number;
  codigo: string | null;
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
}

export default function Dashboard() {
  const [items, setItems] = useState<Item[]>([]);
  const [stats, setStats] = useState<Stats>({
    total_items: 0,
    total_stock: 0,
    total_value: 0,
    low_stock: 0,
    categories_count: 0,
    categories: [],
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [stockFilter, setStockFilter] = useState<"todos" | "bajo" | "ok">("todos");

  // Modals
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    codigo: "",
    nombre: "",
    descripcion: "",
    categoria: "General",
    cantidad: 1,
    precio_unitario: 0.0,
    ubicacion: "",
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
      const matchesSearch =
        item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.codigo && item.codigo.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.descripcion && item.descripcion.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.ubicacion && item.ubicacion.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCat =
        selectedCategory === "Todas" || item.categoria === selectedCategory;

      const matchesStock =
        stockFilter === "todos"
          ? true
          : stockFilter === "bajo"
          ? item.cantidad <= 3
          : item.cantidad > 3;

      return matchesSearch && matchesCat && matchesStock;
    });
  }, [items, searchTerm, selectedCategory, stockFilter]);

  // Open Modal for New Item
  const handleOpenNewModal = () => {
    setEditingItem(null);
    setFormData({
      codigo: `ITM-${Math.floor(1000 + Math.random() * 9000)}`,
      nombre: "",
      descripcion: "",
      categoria: "General",
      cantidad: 1,
      precio_unitario: 0.0,
      ubicacion: "",
    });
    setIsItemModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEditModal = (item: Item) => {
    setEditingItem(item);
    setFormData({
      codigo: item.codigo || "",
      nombre: item.nombre,
      descripcion: item.descripcion || "",
      categoria: item.categoria || "General",
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      ubicacion: item.ubicacion || "",
    });
    setIsItemModalOpen(true);
  };

  // Submit Save/Update
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      showToast("El nombre del ítem es obligatorio", "error");
      return;
    }

    try {
      if (editingItem) {
        // Update
        const res = await fetch(`${API_URL}/items/${editingItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (res.ok) {
          showToast("Ítem actualizado exitosamente");
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
          body: JSON.stringify(formData),
        });
        if (res.ok) {
          showToast("Ítem registrado en el inventario");
          setIsItemModalOpen(false);
          fetchData();
        } else {
          showToast("Error al guardar ítem", "error");
        }
      }
    } catch (err) {
      showToast("Error de red al guardar", "error");
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
        // Refresh stats
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
    if (!confirm(`¿Confirmas eliminar permanentemente '${nombre}'?`)) return;
    try {
      const res = await fetch(`${API_URL}/items/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Ítem eliminado");
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
    <div className="min-h-screen bg-[#070a13] text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 ${
            toast.type === "success"
              ? "bg-emerald-950/90 text-emerald-200 border-emerald-700/60"
              : "bg-rose-950/90 text-rose-200 border-rose-700/60"
          }`}
        >
          <span className="text-lg">{toast.type === "success" ? "✓" : "⚠"}</span>
          <span className="font-medium text-sm">{toast.message}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-[#0c1222]/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20 font-black text-xl text-white">
            OD
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-white">
                ODINVENTARIO
              </h1>
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-full">
                v2.0 Omni-Stack
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Servidor Activo • 192.168.100.2
            </p>
          </div>
        </div>

        {/* Global Quick Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            title="Refrescar catálogo"
            className="p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-slate-300 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700/90 border border-slate-700 text-slate-200 font-medium text-sm flex items-center gap-2 transition-all hover:border-slate-600 shadow-sm"
          >
            <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span>Carga Masiva IA</span>
          </button>

          <button
            onClick={handleOpenNewModal}
            className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Agregar Ítem</span>
          </button>
        </div>
      </header>

      <main className="p-6 max-w-7xl w-full mx-auto flex-1 flex flex-col gap-6">
        {/* KPI Statistics Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Items */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-[#11192e] to-[#0c1222] border border-slate-800/80 shadow-lg relative overflow-hidden group hover:border-blue-500/40 transition-all">
            <div className="absolute -right-3 -top-3 w-20 h-20 bg-blue-600/10 rounded-full blur-xl group-hover:bg-blue-600/20 transition-all"></div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Catálogo
            </p>
            <div className="flex items-baseline justify-between mt-2">
              <h3 className="text-3xl font-extrabold text-white tracking-tight">
                {stats.total_items}
              </h3>
              <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {stats.categories_count} categorías
              </span>
            </div>
          </div>

          {/* Card 2: Total Units */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-[#11192e] to-[#0c1222] border border-slate-800/80 shadow-lg relative overflow-hidden group hover:border-cyan-500/40 transition-all">
            <div className="absolute -right-3 -top-3 w-20 h-20 bg-cyan-600/10 rounded-full blur-xl group-hover:bg-cyan-600/20 transition-all"></div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Stock Físico Total
            </p>
            <div className="flex items-baseline justify-between mt-2">
              <h3 className="text-3xl font-extrabold text-white tracking-tight">
                {stats.total_stock}
              </h3>
              <span className="text-xs text-slate-400 font-medium">unidades</span>
            </div>
          </div>

          {/* Card 3: Total Valuation */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-[#11192e] to-[#0c1222] border border-slate-800/80 shadow-lg relative overflow-hidden group hover:border-emerald-500/40 transition-all">
            <div className="absolute -right-3 -top-3 w-20 h-20 bg-emerald-600/10 rounded-full blur-xl group-hover:bg-emerald-600/20 transition-all"></div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Valoración Inventario
            </p>
            <div className="flex items-baseline justify-between mt-2">
              <h3 className="text-3xl font-extrabold text-emerald-400 tracking-tight">
                ${stats.total_value.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </h3>
              <span className="text-xs text-emerald-500 font-semibold">USD</span>
            </div>
          </div>

          {/* Card 4: Low Stock Alert */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-[#11192e] to-[#0c1222] border border-slate-800/80 shadow-lg relative overflow-hidden group hover:border-amber-500/40 transition-all">
            <div className="absolute -right-3 -top-3 w-20 h-20 bg-amber-600/10 rounded-full blur-xl group-hover:bg-amber-600/20 transition-all"></div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Stock Crítico (≤ 3)
            </p>
            <div className="flex items-baseline justify-between mt-2">
              <h3 className="text-3xl font-extrabold text-amber-400 tracking-tight">
                {stats.low_stock}
              </h3>
              <span
                className={`text-xs px-2 py-0.5 rounded font-medium ${
                  stats.low_stock > 0
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {stats.low_stock > 0 ? "Requiere Atención" : "Óptimo"}
              </span>
            </div>
          </div>
        </section>

        {/* Control and Filter Bar */}
        <section className="bg-[#0f172a]/90 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[220px]">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Buscar por código, nombre, ubicación..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-900/90 border border-slate-700/70 rounded-xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
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
              className="py-2 px-3.5 bg-slate-900/90 border border-slate-700/70 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
            >
              <option value="Todas">Categoría: Todas</option>
              {stats.categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Stock Level Filter Tabs */}
            <div className="flex items-center bg-slate-900/90 border border-slate-700/70 rounded-xl p-1 text-xs">
              <button
                onClick={() => setStockFilter("todos")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  stockFilter === "todos"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setStockFilter("bajo")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  stockFilter === "bajo"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Stock Bajo
              </button>
              <button
                onClick={() => setStockFilter("ok")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  stockFilter === "ok"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                En Regla
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-400 font-medium whitespace-nowrap">
            Mostrando <span className="text-white font-bold">{filteredItems.length}</span> de{" "}
            <span className="text-white font-bold">{items.length}</span> ítems
          </div>
        </section>

        {/* Main Data Table */}
        <section className="bg-[#0e1628]/80 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex-1 flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-[#090e1c] text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Código / SKU</th>
                  <th className="py-3.5 px-4">Ítem / Descripción</th>
                  <th className="py-3.5 px-4">Categoría</th>
                  <th className="py-3.5 px-4 text-center">Stock</th>
                  <th className="py-3.5 px-4 text-right">Precio Unitario</th>
                  <th className="py-3.5 px-4 text-right">Subtotal</th>
                  <th className="py-3.5 px-4">Ubicación</th>
                  <th className="py-3.5 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-sm">Cargando inventario desde el servidor...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-500 text-xl">
                          📦
                        </div>
                        <p className="text-base font-semibold text-slate-300">
                          No se encontraron ítems
                        </p>
                        <p className="text-xs text-slate-500 max-w-sm">
                          Prueba cambiando los filtros de búsqueda o agrega un nuevo producto manual con el botón superior.
                        </p>
                        <button
                          onClick={handleOpenNewModal}
                          className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium"
                        >
                          + Agregar Nuevo Ítem
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
                        className="hover:bg-slate-800/40 transition-colors group"
                      >
                        {/* SKU */}
                        <td className="py-3.5 px-4 font-mono text-xs text-blue-400 font-semibold whitespace-nowrap">
                          {item.codigo || "S/C"}
                        </td>

                        {/* Nombre & Descripción */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="font-semibold text-slate-100 group-hover:text-blue-300 transition-colors">
                            {item.nombre}
                          </div>
                          {item.descripcion && (
                            <div className="text-xs text-slate-400 truncate max-w-xs mt-0.5">
                              {item.descripcion}
                            </div>
                          )}
                        </td>

                        {/* Categoría */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="px-2.5 py-1 text-xs rounded-full bg-slate-800 text-slate-300 border border-slate-700/80 font-medium">
                            {item.categoria || "General"}
                          </span>
                        </td>

                        {/* Stock Controls */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 rounded-lg p-1">
                            <button
                              onClick={() => handleAdjustStock(item.id, -1)}
                              disabled={item.cantidad <= 0}
                              title="Restar 1"
                              className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
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
                              className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
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
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-100 whitespace-nowrap">
                          ${subtotal.toFixed(2)}
                        </td>

                        {/* Ubicación */}
                        <td className="py-3.5 px-4 text-xs text-slate-400 whitespace-nowrap">
                          {item.ubicacion ? (
                            <span className="flex items-center gap-1">
                              <span className="text-slate-500">📍</span>
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
                              title="Editar Ítem"
                              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-blue-600/30 text-slate-300 hover:text-blue-400 border border-slate-700/60 transition-all"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id, item.nombre)}
                              title="Eliminar Ítem"
                              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-600/30 text-slate-300 hover:text-rose-400 border border-slate-700/60 transition-all"
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

      {/* MODAL: Crear / Editar Ítem */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                {editingItem ? "Editar Ítem de Inventario" : "Registrar Nuevo Ítem"}
              </h3>
              <button
                onClick={() => setIsItemModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="flex flex-col gap-3.5 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Código / SKU
                  </label>
                  <input
                    type="text"
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    placeholder="Ej. SRV-001"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Categoría
                  </label>
                  <input
                    type="text"
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    placeholder="Ej. Servidores, Redes..."
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Nombre del Ítem *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej. Switch Cisco 48 Puertos"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Cantidad Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.cantidad}
                    onChange={(e) => setFormData({ ...formData, cantidad: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Precio Unitario ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.precio_unitario}
                    onChange={(e) => setFormData({ ...formData, precio_unitario: parseFloat(e.target.value) || 0.0 })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Ubicación en Almacén / Estante
                </label>
                <input
                  type="text"
                  value={formData.ubicacion}
                  onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
                  placeholder="Ej. Estante A-12, Almacén Central"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Descripción Técnica / Notas
                </label>
                <textarea
                  rows={2}
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Especificaciones o detalles adicionales..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-lg shadow-blue-600/30 transition-all"
                >
                  {editingItem ? "Actualizar Cambios" : "Guardar en Inventario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Carga Masiva Inteligente */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                Carga Masiva con Inteligencia Artificial
              </h3>
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Adjunta una hoja de cálculo (Excel), documento Word o PDF. Nuestro motor de IA analizará y ubicará de forma automática cada producto en su respectiva categoría.
            </p>

            <form onSubmit={handleUploadSubmit} className="flex flex-col gap-4">
              <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500/70 rounded-2xl p-8 text-center bg-slate-900/60 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer relative">
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
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-2xl mb-1">
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
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadFile}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-xs shadow-lg shadow-cyan-600/20 transition-all flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Procesando...</span>
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
