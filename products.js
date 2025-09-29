/* =====================================================
   datos de productos
   ===================================================== */
const NOIMG = 'https://picsum.photos/800/600?random=7';

const PRODUCTS = [
  {
    id: "zapatillas-nino",
    name: "Zapatillas Niño",
    brand: "Inv. Jemina",
    basePrice: 123,
    category: "Calzado",
    variants: [
      {
        color: "Amarillo",
        images: [
          "img/Calzado/Zapatillas/zpn1.webp",
          "img/Calzado/Zapatillas/zpn2.webp",
          "img/Calzado/Zapatillas/zpn3.webp"
        ],
        sizes: [
          { label: "12", delta: 0, stock: 8 },
          { label: "13", delta: 1, stock: 3 },
          { label: "14", delta: 2, stock: 0 } // agotado
        ]
      },
      {
        color: "Rojo",
        images: ["img/Calzado/Zapatillas/zpn1.webp"],
        sizes: [
          { label: "12", delta: 0, stock: 5 },
          { label: "13", delta: 1, stock: 2 },
          { label: "14", delta: 2, stock: 1 }
        ]
      },
      {
        color: "Azul",
        images: ["img/Calzado/Zapatillas/zpn2.webp"],
        sizes: [
          { label: "12", delta: 0, stock: 0 },
          { label: "13", delta: 1, stock: 4 },
          { label: "14", delta: 2, stock: 2 }
        ]
      }
    ],
    description: "Livianas y resistentes para aventuras."
  },
  {
    id: "polera-roja",
    name: "Polera",
    brand: "Inv. Jemina",
    basePrice: 88,
    category: "Ropa",
    variants: [
      {
        color: "Rojo",
        images: ["img/polera1.jpg"],
        sizes: [
          { label: "S", delta: 0, stock: 7 },
          { label: "M", delta: 2, stock: 5 },
          { label: "L", delta: 4, stock: 0 },
          { label: "XL", delta: 6, stock: 3 }
        ]
      },
      {
        color: "Blanco",
        images: ["img/polera2.jpg"],
        sizes: [
          { label: "S", delta: 0, stock: 3 },
          { label: "M", delta: 2, stock: 0 },
          { label: "L", delta: 4, stock: 2 }
        ]
      }
    ],
    description: "Corte clásico, interior afelpado."
  },
  {
    id: "buzo-azul",
    name: "Buzo Unisex",
    brand: "Inv. Jemina",
    basePrice: 123,
    category: "Ropa",
    variants: [
      {
        color: "Azul",
        images: ["img/buzo1.jpg"],
        sizes: [
          { label: "S", delta: 0, stock: 3 },
          { label: "M", delta: 0, stock: 2 },
          { label: "L", delta: 0, stock: 1 }
        ]
      }
    ],
    description: "Suave, resistente y cómodo."
  },
  {
    id: "lampara-clasica",
    name: "Lámpara Clásica",
    brand: "Inv. Jemina",
    basePrice: 125,
    category: "Hogar",
    variants: [
      { color: "Negro", images: ["img/lampara1.jpg"], sizes: [] }
    ],
    description: "Iluminación cálida para espacios modernos."
  }
];
