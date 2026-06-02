# LEN — Brand Guide v1.0
**Fecha:** 2026-04-15

---

## 1. NOMBRE Y CONCEPTO

**LEN** — Red Digital de Monedas Regionales Centroamericanas

El nombre es corto, neutro, internacional. No referencia ningún país
específico, lo que permite expansión regional sin rebrand.

**Taglines:**
- ES: *"El sistema cambista, digitalizado y legal."*
- EN: *"The border money changer, digitized and legal."*
- Corto ES: *"Transfiere sin fronteras."*
- Corto EN: *"Move money across borders."*

---

## 2. PALETA DE COLORES

### Colores primarios
| Nombre       | Hex       | Uso                          |
|--------------|-----------|------------------------------|
| `len-dark`   | `#1E1B4B` | Fondo oscuro, navy            |
| `len-mid`    | `#312E81` | Gradiente intermedio          |
| `len-purple` | `#4338CA` | Color principal, CTA          |
| `len-violet` | `#818CF8` | Acento, texto secundario      |

### Colores secundarios
| Nombre         | Hex       | Uso                          |
|----------------|-----------|------------------------------|
| `len-light`    | `#EEF2FF` | Fondos claros, badges         |
| `len-border`   | `#E0E7FF` | Bordes, separadores           |
| `len-surface`  | `#F9FAFB` | Fondo neutro (modo claro)     |
| `mondega-green`| `#059669` | Éxito, confirmaciones, fees   |

### Gradiente principal
```
linear-gradient(135deg, #1E1B4B 0%, #312E81 55%, #4338CA 100%)
```

### Colores por token
| Token    | Color accent     | Bandera |
|----------|------------------|---------|
| MEXCOIN  | `#006847` (verde MX) | 🇲🇽 |
| QUETZA   | `#4997D0` (azul GT)  | 🇬🇹 |
| LEMPI    | `#003DA5` (azul HN)  | 🇭🇳 |

---

## 3. TIPOGRAFÍA

### Fuente principal: **Inter**
```
https://fonts.google.com/specimen/Inter
Pesos: 400 · 500 · 600 · 700 · 800
```

### Jerarquía tipográfica
| Nivel      | Peso | Tamaño | Uso                    |
|------------|------|--------|------------------------|
| Display    | 800  | 96px   | Hero, pantalla login   |
| H1         | 700  | 48px   | Títulos principales    |
| H2         | 700  | 32px   | Secciones              |
| H3         | 600  | 24px   | Subtítulos             |
| Body       | 400  | 16px   | Texto corrido          |
| Caption    | 500  | 12px   | Labels, badges         |
| Monospace  | —    | 14px   | Montos, números        |

### Regla de montos
Los montos siempre van en `font-weight: 800` + `tabular-nums` para
que los dígitos no salten de ancho al actualizarse.

---

## 4. LOGO MARK

### Concepto: Red de tres nodos
Tres círculos conectados representando MX · GT · HN.
Sugiere: red, movimiento, interconexión, sin jerarquía de países.

```
    [MX] ——— [GT]
       \     /
        [HN]
```

### Variantes
| Variante          | Uso                              |
|-------------------|----------------------------------|
| Completo          | Nodo + "LEN" wordmark horizontal |
| Solo wordmark     | Texto "LEN" con letter-spacing   |
| Solo icono        | App icon, favicon                |
| Invertido (blanco)| Sobre fondos oscuros             |

### Archivos
- `LEN_thumbnail_stellar.svg` — thumbnail 16:9 para Stellar SCF
- (pendiente) `LEN_logo.svg` — logo aislado en variantes

---

## 5. COMPONENTES UI

### Tarjetas de token
- Fondo: gradiente `len-purple → len-violet` con opacidad 60–70%
- Borde: `1px solid #818CF8` con `opacity: 0.2`
- Radio: `20px`
- Sombra: `0 8px 40px rgba(67, 56, 202, 0.20)`

### Botones
- Primario: `#4338CA` → hover `opacity: 0.9`
- Secundario: border `2px solid #4338CA`
- Radio: `rounded-2xl` (16px)

### Badges de estado
- Éxito: `bg-emerald-100 text-emerald-700`
- Warning: `bg-amber-100 text-amber-700`
- Error: `bg-red-100 text-red-700`
- Purple: `bg-len-light text-len-purple`

---

## 6. VOZ Y TONO

### Para usuarios (comerciantes informales)
- Lenguaje simple, directo, sin jerga técnica
- Nunca decir "blockchain", "smart contract", "token"
- Decir: "moneda digital", "enviar", "recibir", "tu saldo"

### Para inversores
- Profesional, datos concretos, sin hype
- Énfasis en: legal, regulado, modelo probado (cambistas)
- Siempre mencionar el TAM: $500M economía informal GT/MX/HN

### Para Stellar/crypto
- Pueden recibir términos técnicos
- Mencionar: path payments, anchors, DEX, finality, settlement

---

## 7. ANIMACIONES Y MICRO-INTERACCIONES

```
transition-all duration-150   ← acciones rápidas (hover, click)
transition-all duration-300   ← transiciones de pantalla
active:scale-[0.98]           ← botones al presionar
```

---

## 8. NO HACER (Brand Don'ts)

- No usar el logo sobre fotografías sin overlay oscuro
- No cambiar los colores de los tokens por país (son fijos)
- No usar "MONDEGA" en materiales públicos (es el nombre del repo)
- No mezclar Inter con otras fuentes
- No usar gradiente en texto (solo en fondos y cards)

---

*Brand Guide generado — Claude Sonnet 4.6 · 2026-04-15*
