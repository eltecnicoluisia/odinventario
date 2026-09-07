// Datos institucionales precargados para alta disponibilidad (GitHub Pages y modo offline)
export const DEFAULT_ITEMS = [
  {
    "id": 1,
    "codigo": "SRV-DELL-01",
    "numero_bien_nacional": "BN-2024-00101",
    "nombre": "Servidor Dell PowerEdge R750",
    "descripcion": "2x Xeon Gold 6330, 128GB RAM, 4TB SAS RAID 10, Red 10GbE",
    "tipo_articulo": "Activo Fijo",
    "categoria": "Servidores",
    "cantidad": 2,
    "precio_unitario": 4500.0,
    "ubicacion": "Rack A-01, Centro de Cómputo",
    "estado": "Distrito Capital",
    "sede": "Galpón Central La Yaguara"
  },
  {
    "id": 2,
    "codigo": "IMP-HP-M608",
    "numero_bien_nacional": "BN-MIN-009182",
    "nombre": "Impresora Multifuncional HP LaserJet Enterprise",
    "descripcion": "Láser Monocromática alto rendimiento, escaneo dúplex de red",
    "tipo_articulo": "Activo Fijo",
    "categoria": "Equipos de Impresion",
    "cantidad": 5,
    "precio_unitario": 920.0,
    "ubicacion": "Piso 3 - Oficina Contabilidad",
    "estado": "Miranda",
    "sede": "Oficina Principal Torre Europa"
  },
  {
    "id": 3,
    "codigo": "SSD-NVME-2TB",
    "numero_bien_nacional": null,
    "nombre": "Disco SSD Samsung 990 PRO 2TB NVMe",
    "descripcion": "Almacenamiento ultrarrápido PCIe 4.0 para estaciones de diseño",
    "tipo_articulo": "Equipo Tecnológico",
    "categoria": "Componentes",
    "cantidad": 8,
    "precio_unitario": 175.0,
    "ubicacion": "Gabinete Seguro B",
    "estado": "Miranda",
    "sede": "Oficina Principal Torre Europa"
  },
  {
    "id": 4,
    "codigo": "CAB-UTP-CAT6A",
    "numero_bien_nacional": null,
    "nombre": "Bobina Cable UTP Cat6A 305m 100% Cobre",
    "descripcion": "Cable estructurado LSZH azul para centros de datos",
    "tipo_articulo": "Consumible",
    "categoria": "Cableado",
    "cantidad": 12,
    "precio_unitario": 185.0,
    "ubicacion": "Bodega General - Palet 14",
    "estado": "Carabobo",
    "sede": "Centro Logístico Carabobo"
  },
  {
    "id": 5,
    "codigo": "UPS-APC-3K",
    "numero_bien_nacional": "BN-2024-00205",
    "nombre": "UPS Online APC Smart-UPS RT 3000VA",
    "descripcion": "Sistema de respaldo eléctrico con tarjeta de red SNMP",
    "tipo_articulo": "Activo Fijo",
    "categoria": "Energía",
    "cantidad": 3,
    "precio_unitario": 1420.0,
    "ubicacion": "Sala de Energía",
    "estado": "Carabobo",
    "sede": "Centro Logístico Carabobo"
  },
  {
    "id": 6,
    "codigo": "SFP-10G-SR",
    "numero_bien_nacional": null,
    "nombre": "Transceiver SFP+ 10GBASE-SR 850nm",
    "descripcion": "Módulo óptico multimodo LC dúplex hasta 300m",
    "tipo_articulo": "Consumible",
    "categoria": "Conectividad",
    "cantidad": 45,
    "precio_unitario": 32.0,
    "ubicacion": "Gaveta Óptica 03",
    "estado": "Zulia",
    "sede": "Almacén Regional Occidente"
  },
  {
    "id": 7,
    "codigo": "LAP-THINK-T14",
    "numero_bien_nacional": "BN-2024-00301",
    "nombre": "Laptop Lenovo ThinkPad T14 Gen 4",
    "descripcion": "Intel Core i7, 32GB RAM, 1TB SSD, Teclado Retroiluminado",
    "tipo_articulo": "Equipo Tecnológico",
    "categoria": "Computación",
    "cantidad": 7,
    "precio_unitario": 1150.0,
    "ubicacion": "Inventario IT Central",
    "estado": "Zulia",
    "sede": "Almacén Regional Occidente"
  },
  {
    "id": 8,
    "codigo": "SW-CISCO-C9300",
    "numero_bien_nacional": "BN-2024-00402",
    "nombre": "Switch Cisco Catalyst 9300 48 Puertos PoE+",
    "descripcion": "Switch de capa 3 administrable con uplinks de 10Gbps modulares",
    "tipo_articulo": "Activo Fijo",
    "categoria": "Redes",
    "cantidad": 2,
    "precio_unitario": 2300.0,
    "ubicacion": "Rack Telecom B",
    "estado": "Anzoátegui",
    "sede": "Estación Técnica Oriente"
  },
  {
    "id": 9,
    "codigo": "MOB-ESC-ERG",
    "numero_bien_nacional": "BN-2024-00509",
    "nombre": "Estación de Trabajo Ergonómica Ejecutiva",
    "descripcion": "Escritorio en L con estructura metálica y pasacables integrado",
    "tipo_articulo": "Mobiliario",
    "categoria": "Mobiliario y Oficinas",
    "cantidad": 6,
    "precio_unitario": 380.0,
    "ubicacion": "Área de Proyectos",
    "estado": "Anzoátegui",
    "sede": "Estación Técnica Oriente"
  }
];

export const DEFAULT_CATEGORIES = [
  {
    "id": 1,
    "nombre": "Servidores",
    "descripcion": "Servidores en rack, blade y componentes de centros de datos",
    "color": "#3b82f6"
  },
  {
    "id": 2,
    "nombre": "Redes",
    "descripcion": "Switches, routers empresariales, firewalls y antenas",
    "color": "#06b6d4"
  },
  {
    "id": 3,
    "nombre": "Computación",
    "descripcion": "Equipos de escritorio, laptops y estaciones de trabajo",
    "color": "#8b5cf6"
  },
  {
    "id": 4,
    "nombre": "Energía",
    "descripcion": "UPS, plantas eléctricas, baterías y reguladores",
    "color": "#10b981"
  },
  {
    "id": 5,
    "nombre": "Cableado",
    "descripcion": "Cables de par trenzado, fibra óptica, patch cords y conectores",
    "color": "#f59e0b"
  },
  {
    "id": 6,
    "nombre": "Componentes",
    "descripcion": "Discos NVMe, memorias RAM, fuentes de poder y repuestos",
    "color": "#ec4899"
  },
  {
    "id": 7,
    "nombre": "Equipos de Impresion",
    "descripcion": "Impresoras láser, multifuncionales y escáneres",
    "color": "#6366f1"
  },
  {
    "id": 8,
    "nombre": "Mobiliario y Oficinas",
    "descripcion": "Escritorios, sillas ergonómicas, estantes y archivos",
    "color": "#14b8a6"
  }
];

export const DEFAULT_TYPES = [
  {
    "id": 1,
    "nombre": "Activo Fijo",
    "descripcion": "Bienes tangibles de uso permanente con control de Bien Nacional",
    "prefijo": "BN"
  },
  {
    "id": 2,
    "nombre": "Equipo Tecnológico",
    "descripcion": "Hardware de computación, servidores, laptops y periféricos",
    "prefijo": "EQ"
  },
  {
    "id": 3,
    "nombre": "Mobiliario",
    "descripcion": "Muebles y enseres de oficina",
    "prefijo": "MOB"
  },
  {
    "id": 4,
    "nombre": "Consumible",
    "descripcion": "Materiales gastables que no requieren asignación de bien nacional",
    "prefijo": "CON"
  },
  {
    "id": 5,
    "nombre": "Herramienta",
    "descripcion": "Instrumentos de trabajo, testers y herramientas técnicas",
    "prefijo": "HER"
  },
  {
    "id": 6,
    "nombre": "Redes y Telecom",
    "descripcion": "Infraestructura de telecomunicaciones y enlaces",
    "prefijo": "RED"
  },
  {
    "id": 7,
    "nombre": "Material de Oficina",
    "descripcion": "Artículos de papelería y suministros administrativos",
    "prefijo": "MAT"
  }
];

export const DEFAULT_SEDES = [
  {
    "id": 1,
    "nombre": "Galpón Central La Yaguara",
    "tipo": "Galpón",
    "estado": "Distrito Capital",
    "ciudad": "Caracas",
    "direccion": "Av. Intercomunal La Yaguara, Parcela 12",
    "responsable": "Ing. Carlos Pérez",
    "telefono": "0212-4431122",
    "capacidad": "1,200 m²"
  },
  {
    "id": 2,
    "nombre": "Oficina Principal Torre Europa",
    "tipo": "Sede Administrativa",
    "estado": "Miranda",
    "ciudad": "Chacao",
    "direccion": "Av. Francisco de Miranda, Piso 8",
    "responsable": "Lic. María Rodríguez",
    "telefono": "0212-9513344",
    "capacidad": "450 m²"
  },
  {
    "id": 3,
    "nombre": "Almacén Regional Occidente",
    "tipo": "Almacén",
    "estado": "Zulia",
    "ciudad": "Maracaibo",
    "direccion": "Zona Industrial Maracaibo Sur, Galpón 4",
    "responsable": "Tsu. Roberto Gómez",
    "telefono": "0261-7352211",
    "capacidad": "800 m²"
  },
  {
    "id": 4,
    "nombre": "Centro Logístico Carabobo",
    "tipo": "Galpón",
    "estado": "Carabobo",
    "ciudad": "Valencia",
    "direccion": "Zona Industrial Castillito, Parcela B",
    "responsable": "Ing. Elena Ramos",
    "telefono": "0241-8716655",
    "capacidad": "1,500 m²"
  },
  {
    "id": 5,
    "nombre": "Estación Técnica Oriente",
    "tipo": "Oficina",
    "estado": "Anzoátegui",
    "ciudad": "Barcelona",
    "direccion": "Av. Jorge Rodríguez, Edif. Oriente",
    "responsable": "Ing. Luis Morales",
    "telefono": "0281-2869988",
    "capacidad": "300 m²"
  },
  {
    "id": 6,
    "nombre": "Almacén Siderúrgico Guayana",
    "tipo": "Almacén",
    "estado": "Bolívar",
    "ciudad": "Puerto Ordaz",
    "direccion": "Zona Industrial Unare II, Calle 3",
    "responsable": "Tsu. Javier Soto",
    "telefono": "0286-9524433",
    "capacidad": "700 m²"
  }
];
