<img width="1536" height="1024" alt="image" src="https://github.com/user-attachments/assets/feae14e9-8d68-41f9-9e33-e444f1a6f360" />


# Canvas UI Engine (working name)

> **Canvas-based UI Engine for Mobile & Embedded Apps**  
> A high-performance UI engine rendered with Canvas/WebGL, running inside a WebView runtime (Capacitor / Cordova), without DOM, HTML or CSS.

---

# Installation
npm install canvasframework
npm install -D vite

# add in package.json
"scripts": {
  "dev": "vite",
  "build": "vite build"
}

# launch
npm run dev
---

## 🚀 Overview

**Canvas UI Engine** is a **low-level UI engine** that renders the entire user interface using **Canvas 2D or WebGL**, instead of the DOM.

Although it runs inside a WebView, it **does not rely on HTML, CSS, or the browser layout engine**.  
The WebView is used **only as a JavaScript runtime**, not as a UI system.

> Think **Flutter’s rendering model**, but implemented in **JavaScript**, running inside a WebView.

---

## ❌ What this engine is NOT

- ❌ Not a web framework  
- ❌ Not DOM-based  
- ❌ Not Ionic / React / Vue  
- ❌ Not HTML/CSS driven  
- ❌ Not designed for SEO or websites  

---

## ✅ What this engine IS

- ✅ A **Canvas-first UI engine**
- ✅ A **custom rendering pipeline**
- ✅ A **custom layout system**
- ✅ A **custom input & gesture system**
- ✅ A **deterministic, app-like UI**
- ✅ Designed for **mobile & embedded apps**

---

## 🧠 Architecture

<img width="1536" height="1024" alt="image" src="https://github.com/user-attachments/assets/da04de5b-0223-4241-86bc-ccb6b7ac0eaa" />


> **The WebView is only a runtime shell.**  
> **The UI is fully controlled by the engine (no DOM, no HTML layout).**


### Key point

> **The browser does not manage UI.  
> The engine does.**

---

## 🎨 Rendering

- Canvas 2D (CPU)
- Optional WebGL backend (GPU accelerated)
- Device Pixel Ratio aware
- Dirty-region rendering
- Scene graph based

Rendering performance depends **entirely on the engine**, not on the browser DOM.

---

## 🧩 UI Model

- Every component is **drawn**, not mounted
- No HTML nodes
- No CSS
- No reflow
- No repaint cost from the browser

Example components:
- Button
- Text
- Input
- Slider
- Switch
- List / Card
- Modal / Dialog / BottomSheet
- Navigation & routing system

---

## 🧭 Navigation

- Internal routing system
- Stack-based navigation
- Animated transitions (slide / fade)
- Independent from browser routing logic

---

## 🧵 Multithreading

- **UI Worker** → layout & scroll inertia
- **Logic Worker** → business logic
- Main thread → rendering only

This allows smoother UI and better separation of concerns.

---

## 🔌 Native capabilities

Native features are accessed via the **host runtime** (Capacitor / Cordova):

- Camera
- Filesystem
- Secure storage
- Geolocation
- WebSocket
- Network

⚠️ Plugins that **require DOM access are not supported**.

---

## 📦 Data & Networking

The engine provides its own service layer:
- Cached fetch service
- WebSocket manager
- Geolocation abstraction
- Offline-first data handling

All APIs are **engine-controlled**, not browser-controlled.

---

## 🆚 Comparison

### vs React Native

| React Native | Canvas UI Engine |
|-------------|-----------------|
| Native views | Custom rendering |
| Bridge overhead | Direct rendering |
| Platform UI | Engine UI |
| DOM-like model | Scene graph |

---

### vs Flutter

| Flutter | Canvas UI Engine |
|--------|------------------|
| Native engine | WebView runtime |
| Skia | Canvas / WebGL |
| Dart | JavaScript |
| Compiled | Interpreted |
| UI engine | UI engine |

👉 **Same architecture philosophy**, different runtime constraints.

---

## ⚠️ Known limitations

- No DOM access
- No HTML rendering
- No SEO
- No accessibility (yet)
- Text shaping is basic (LTR focused)

These are **intentional design decisions**.

---

## 🎯 Target use cases

- Mobile applications
- Embedded systems
- Kiosk interfaces
- Medical / industrial apps
- Offline-first apps
- UI where **control > compatibility**

---

## 🛣️ Roadmap (simplified)

### Phase 1 – Core engine (current)
- Canvas/WebGL rendering
- Input & layout
- Core components

### Phase 2 – Performance & UX
- Gesture system
- Animation engine
- Advanced scrolling
- Asset caching

### Phase 3 – Ecosystem
- Plugin bridge
- Devtools
- Theming system

---

## 🧪 Philosophy

> **The WebView is just a runtime.  
> The UI is owned by the engine.**

If the engine is fast → the app is fast.  
If the engine is slow → nothing can save it.

---

##  Exemples
  # Exemple – Accordion
  
Afficher des sections d’informations extensibles (FAQ, paramètres, détails).
```
import { Accordion } from './framework/index.js';

const accordion = new Accordion(app, {
  x: 16,
  y: 80,
  width: app.width - 32,
  title: 'Informations du compte',
  icon: 'ℹ️',
  content: 'Votre compte vous permet de gérer vos préférences, votre sécurité et vos informations personnelles.',
  expanded: false,
  onToggle: (expanded) => {
    console.log('Accordion ouvert ?', expanded);
  }
});

app.add(accordion);
```

  # Button (Material / Cupertino auto)

Action principale (submit, navigation, confirmation).
```
import { Button } from './framework/index.js';

const button = new Button(app, {
  x: 16,
  y: 300,
  width: app.width - 32,
  height: 48,
  text: 'Continuer',
  elevation: 4
});

button.onClick = () => {
  console.log('Bouton cliqué');
};

app.add(button);
```

  # Exemple – BottomNavigationBar

Navigation principale d’application mobile.
```
import { BottomNavigationBar } from './framework/index.js';

const bottomNav = new BottomNavigationBar(app, {
  items: [
    { icon: 'home', label: 'Accueil' },
    { icon: 'search', label: 'Recherche' },
    { icon: 'favorite', label: 'Favoris' },
    { icon: 'person', label: 'Profil' }
  ],
  onChange: (index, item) => {
    console.log('Onglet sélectionné:', index, item.label);
  }
});

app.add(bottomNav);
```

  # Exemple – Dialog (alert / confirmation)

Alerte, confirmation, choix utilisateur.
```
import { Dialog, Button } from './framework/index.js';

const showDialogBtn = new Button(app, {
  x: 16,
  y: 380,
  width: app.width - 32,
  height: 48,
  text: 'Supprimer le compte'
});

showDialogBtn.onClick = () => {
  const dialog = new Dialog(app, {
    title: 'Confirmation',
    message: 'Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.',
    buttons: ['Annuler', 'Supprimer'],
    onButtonClick: (index, label) => {
      console.log('Bouton dialog:', label);
    }
  });

  app.add(dialog);
  dialog.show();
};

app.add(showDialogBtn);
```


  # Exemple – Combinaison réelle (mini écran)

```
app.add(new Text(app, {
  x: 16,
  y: 24,
  text: 'Paramètres',
  fontSize: 22,
  bold: true
}));

// Accordéon
app.add(new Accordion(app, {
  x: 16,
  y: 80,
  width: app.width - 32,
  title: 'Sécurité',
  content: 'Changez votre mot de passe, activez la double authentification.'
}));

// Bouton
app.add(new Button(app, {
  x: 16,
  y: 240,
  width: app.width - 32,
  height: 48,
  text: 'Déconnexion'
}));

// Navigation
app.add(new BottomNavigationBar(app, {
  items: [
    { icon: 'home', label: 'Accueil' },
    { icon: 'settings', label: 'Paramètres' }
  ]
}));
```

  # Stack – superposition (équivalent Flutter Stack)

Exemple : carte avec image + titre + bouton flottant

```
import Stack from './layout/Stack.js';
import Text from './components/Text.js';
import Button from './components/Button.js';
import Image from './components/Image.js';

const card = new Stack(app, {
  x: 16,
  y: 40,
  width: app.width - 32,
  height: 200
});

card.add(new Image(app, {
  src: 'cover.jpg',
  width: card.width,
  height: 200
}));

card.add(new Text(app, {
  x: 16,
  y: 16,
  text: 'Titre de la carte',
  fontSize: 20,
  color: '#FFFFFF'
}));

card.add(new Button(app, {
  x: card.width - 72,
  y: card.height - 56,
  width: 56,
  height: 56,
  text: '+'
}));

app.add(card);
card.layoutRecursive();
```

  # Column – layout vertical (Flutter Column)

Exemple : écran de paramètres

```
import Column from './layout/Column.js';
import Text from './components/Text.js';
import Button from './components/Button.js';

const column = new Column(app, {
  x: 16,
  y: 40,
  width: app.width - 32,
  spacing: 12,
  align: 'stretch'
});

column.add(new Text(app, {
  text: 'Paramètres',
  fontSize: 22,
  height: 32
}));

column.add(new Button(app, {
  height: 48,
  text: 'Compte'
}));

column.add(new Button(app, {
  height: 48,
  text: 'Sécurité'
}));

column.add(new Button(app, {
  height: 48,
  text: 'Notifications'
}));

app.add(column);
column.layout();
```

  # Row – layout horizontal (Flutter Row)

Exemple : barre d’actions

```
import Row from './layout/Row.js';
import Button from './components/Button.js';

const actions = new Row(app, {
  x: 16,
  y: 120,
  height: 48,
  spacing: 12,
  align: 'center'
});

actions.add(new Button(app, {
  width: 100,
  height: 40,
  text: 'Annuler'
}));

actions.add(new Button(app, {
  width: 120,
  height: 40,
  text: 'Valider'
}));

app.add(actions);
actions.layout();
```

  # Grid – grille adaptative (Flutter GridView.count)

Exemple : grille d’options

```
import Grid from './layout/Grid.js';
import Card from './components/Card.js';

const grid = new Grid(app, {
  x: 16,
  y: 200,
  width: app.width - 32,
  columns: 3,
  spacing: 12
});

for (let i = 0; i < 6; i++) {
  grid.add(new Card(app, {
    height: 100,
    title: `Item ${i + 1}`
  }));
}

app.add(grid);
grid.layout();
```

  # Composition réelle (comme Flutter 😏)

```
const screen = new Column(app, {
  x: 0,
  y: 0,
  width: app.width,
  spacing: 24,
  align: 'stretch'
});

// Header
screen.add(new Text(app, {
  text: 'Accueil',
  fontSize: 24,
  height: 40
}));

// Hero
const hero = new Stack(app, {
  width: app.width,
  height: 180
});

hero.add(new Image(app, {
  src: 'hero.jpg',
  width: app.width,
  height: 180
}));

hero.add(new Text(app, {
  x: 16,
  y: 120,
  text: 'Bienvenue',
  fontSize: 20,
  color: '#FFF'
}));

screen.add(hero);

// Actions
const row = new Row(app, {
  height: 48,
  spacing: 12
});

row.add(new Button(app, { width: 120, height: 40, text: 'Explorer' }));
row.add(new Button(app, { width: 120, height: 40, text: 'Profil' }));

screen.add(row);

app.add(screen);
screen.layoutRecursive();
```

## 📄 License

MIT
