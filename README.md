 <img width="1536" height="1024" alt="image" src="https://github.com/user-attachments/assets/feae14e9-8d68-41f9-9e33-e444f1a6f360" />


# Canvas UI Engine (UI engine inspired by Flutter, built for the Web)

> **Canvas-based UI Engine for Mobile & Embedded Apps**  
> A high-performance UI engine rendered with Canvas/WebGL, running inside a WebView runtime (Capacitor / Cordova), without DOM, HTML or CSS.

---

# Installation
- npm install canvasframework
- npm install -D vite

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

## Hello Word Exemple 

```
import { CanvasFramework, Column, ui, createRef, Text } from './canvas-framework/index.js';

const app = new CanvasFramework('app-canvas',{ 
  useWebGL: true, 
  showFps: true,
  debug: true,
});

app.useWebGL = true;

// Route principale
app.route('/', (framework) => {
  const platform = framework.platform === 'material' ? 'Material Design' : 'Cupertino (iOS)';
  
  if (framework.useWebGL) {
    console.log("✅ WebGL est activé");
  } else {
    console.log("⚠️  WebGL non disponible, fallback en Canvas 2D");
  }

  // ✅ Créer une ref pour le texte du slider
  const sliderValueTextRef = createRef();

  ui.app(
    ui.Column({ x: 0, y: 0, spacing: 0 }, [
      // Titre
      ui.Text({
        x: 20,
        y: 50,
        width: framework.width - 40,
        text: `Hello word`,
        fontSize: 24,
        bold: true,
        align: 'center'
      })
      
    ])
  ).mount(framework);
});

// Lancer l'app
app.navigate('/', { transition: 'none' });
```

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

## UIBuilder
with UIBuilder you can build your interface with more simplicity

```
import { CanvasFramework, Column, ui, createRef, Table, Divider, MorphingFAB, PasswordInput, InputTags, InputDatalist, SpeedDialFAB, FAB, FileUpload, OpenStreetMap, SignaturePad, TreeView, SearchInput, ContextMenu, BottomNavigationBar, Card, View, RadioButton, Dialog, Checkbox, PullToRefresh, ProgressBar, AppBar, Skeleton, Drawer, Text, Button, Input, Slider, Select, Switch } from './canvas-framework/index.js';

const app = new CanvasFramework('app-canvas',{ 
  useWebGL: true, 
  showFps: true,
  debug: true,
});

app.useWebGL = true;

// Route principale
app.route('/', (framework) => {
  const platform = framework.platform === 'material' ? 'Material Design' : 'Cupertino (iOS)';
  
  if (framework.useWebGL) {
    console.log("✅ WebGL est activé");
  } else {
    console.log("⚠️  WebGL non disponible, fallback en Canvas 2D");
  }

  // ✅ Créer une ref pour le texte du slider
  const sliderValueTextRef = createRef();

  ui.app(
    ui.Column({ x: 0, y: 0, spacing: 0 }, [
      // Titre
      ui.Text({
        x: 20,
        y: 50,
        width: framework.width - 40,
        text: `Canvas Framework - ${platform}`,
        fontSize: 24,
        bold: true,
        align: 'center'
      }),

      // Bouton Toast
      ui.Button({
        x: framework.width / 2 - 100,
        y: 120,
        width: 200,
        height: 50,
        text: 'Afficher Toast',
        onClick: () => {
          framework.showToast('Toast affiché avec succès!', 2000);
        }
      }),

      // Input
      ui.Input({
        x: 20,
        y: 200,
        width: framework.width - 40,
        height: 50,
        placeholder: 'Entrez du texte...'
      }),

      // Label Slider avec ref
      ui.Text({
        ref: sliderValueTextRef, // ✅ Utiliser ref au lieu de onMount
        x: 20,
        y: 280,
        width: framework.width - 40,
        text: 'Valeur: 50',
        fontSize: 14,
        color: '#666666'
      }),

      // Slider
      ui.Slider({
        x: 20,
        y: 310,
        width: framework.width - 40,
        height: 40,
        value: 50,
        onChange: (value) => {
          if (sliderValueTextRef.current) {
            sliderValueTextRef.current.text = `Valeur: ${Math.round(value)}`;
            sliderValueTextRef.current.markDirty();
          }
        }
      }),

      // Label Select
      ui.Text({
        x: 20,
        y: 380,
        width: framework.width - 40,
        text: 'Menu déroulant:',
        fontSize: 14,
        color: '#666666'
      }),

      // Select
      ui.Select({
        x: 20,
        y: 410,
        width: framework.width - 40,
        height: 50,
        options: ['Option 1', 'Option 2', 'Option 3'],
        selectedIndex: 0,
        onChange: (selectedOption, selectedIndex) => {
          console.log(`Option sélectionnée : ${selectedOption} (index: ${selectedIndex})`);
        }
      }),

      // Label Switch
      ui.Text({
        x: 20,
        y: 490,
        width: framework.width - 100,
        text: 'Activer notifications',
        fontSize: 16
      }),

      // Switch
      ui.Switch({
        x: framework.width - 71,
        y: 485,
        checked: false,
        onChange: (checked) => {
          framework.showToast(checked ? 'Notifications activées' : 'Notifications désactivées');
        }
      }),

      // Bouton Page 2
      ui.Button({
        x: 20,
        y: 550,
        type: 'outlined',
        shape: 'square',
        width: framework.width / 2 - 30,
        height: 50,
        text: 'Page 2 →',
        bgColor: framework.platform === 'material' ? '#03DAC6' : '#FF9500',
        onClick: () => {
          framework.navigate('/page2', { transition: 'fade' });
        }
      }),

      // Bouton Tout Tester
      ui.Button({
        x: framework.width / 2 + 10,
        y: 550,
        width: framework.width / 2 - 30,
        height: 50,
        type: 'filled',
        shape: 'rounded',
        text: 'Tout Tester →',
        bgColor: framework.platform === 'material' ? '#FF9800' : '#34C759',
        onClick: () => {
          framework.navigate('/test', { transition: 'slide' });
        }
      })
    ])
  ).mount(framework);
});

// Page 2 avec Drawer et Navigation
app.route('/page2', (framework) => {
  // ✅ Créer une ref pour le drawer
  const drawerRef = createRef();
  
  ui.app(
    ui.Column({ x: 0, y: 0, spacing: 0 }, [
      
      // Drawer avec ref
      ui.Drawer({
        ref: drawerRef, // ✅ Utiliser ref
        header: { title: 'Mon App' },
        items: [
          { icon: '🏠', label: 'Accueil' },
          { icon: '⚙️', label: 'Paramètres' },
          { icon: '❤️', label: 'Favoris', divider: true },
          { icon: '👤', label: 'Profil' }
        ],
        onItemClick: (index, item) => {
          framework.showToast(`${item.label} cliqué`);
          framework.navigate('/', { transition: 'none' });
        }
      }),
      
      // AppBar (sera au-dessus)
      ui.AppBar({
        title: 'Accueil',
        leftIcon: 'menu',
        rightIcon: 'search',
        onLeftClick: () => {
          if (drawerRef.current) drawerRef.current.open();
        },
        onRightClick: () => {
          framework.showToast('Recherche');
        }
      }),
      
      // PasswordInput
      ui.PasswordInput({
        placeholder: 'Entrez votre mot de passe',
        value: '',
        fontSize: 16,
        x: 20,
        y: 120,
        width: 300,
        height: 40,
        maskChar: '•',
        showPassword: false,
        onFocus: () => {
          console.log('PasswordInput focus');
        },
        onBlur: () => {
          console.log('PasswordInput blur');
        }
      }),
      
      // InputTags
      ui.InputTags({
        placeholder: 'Ajouter des tags...',
        tags: ['javascript', 'canvas'],
        x: 20,
        y: 160,
        width: 300,
        height: 50,
        tagColor: '#E3F2FD',
        tagTextColor: '#1565C0',
        deleteButtonColor: '#1565C0',
        onTagAdd: (tag, allTags) => {
          console.log('Tag ajouté:', tag, 'Tags:', allTags);
        },
        onTagRemove: (tag, allTags) => {
          console.log('Tag supprimé:', tag, 'Tags:', allTags);
        }
      }),
      
      // InputDatalist
      ui.InputDatalist({
        placeholder: 'Sélectionnez un pays...',
        value: '',
        options: [
          'France', 'Allemagne', 'Espagne', 'Italie', 'Portugal',
          'Belgique', 'Suisse', 'Canada', 'États-Unis', 'Japon',
          'Chine', 'Corée du Sud', 'Australie', 'Brésil', 'Mexique'
        ],
        x: 50,
        y: 210,
        width: 300,
        height: 40,
        maxDropdownItems: 8,
        dropdownBackground: '#FFFFFF',
        hoverBackground: '#F0F0F0',
        selectedBackground: '#E3F2FD',
        borderColor: '#CCCCCC',
        onSelect: (selectedValue) => {
          console.log('Option sélectionnée:', selectedValue);
        },
        onInput: (currentValue) => {
          console.log('Valeur en cours:', currentValue);
        }
      }),
      
      // BottomNavigationBar
      ui.BottomNavigationBar({
        items: [
          { icon: 'home', label: 'Home' },
          { icon: 'search', label: 'Search' },
          { icon: 'favorite', label: 'Favorites' },
          { icon: 'person', label: 'Profile' },
          { icon: 'settings', label: 'Settings' }
        ],
        selectedIndex: 0,
        selectedColor: '#6200EE',
        onChange: (index, item) => {
          console.log(`Tab changed to: ${item.label} (index ${index})`);
          switch(index) {
            case 0: framework.navigate('home'); break;
            case 1: framework.navigate('search'); break;
            case 2: framework.navigate('favorites'); break;
            case 3: framework.navigate('profile'); break;
            case 4: framework.navigate('settings'); break;
          }
        }
      })
      
    ])
  ).mount(framework);
});

// Page de test complète
app.route('/test', (framework) => {
  // ✅ Créer toutes les refs nécessaires
  const progressBarRef = createRef();
  const testInputRef = createRef();
  const sliderDisplayRef = createRef();
  const testSwitchRef = createRef();
  
  let yPosition = 80;
  
  ui.app(
    ui.Column({ x: 0, y: 0, spacing: 0 }, [
      
      // AppBar de retour (fixe)
      ui.AppBar({
        title: 'Test Complet',
        leftIcon: 'back',
        onLeftClick: () => {
          framework.navigate('/', { transition: 'slide' });
        }
      }),
      
      // Titre principal
      ui.Text({
        x: 20,
        y: yPosition,
        width: framework.width - 40,
        text: 'Test de tous les composants',
        fontSize: 24,
        bold: true,
        align: 'center'
      }),
      
      // 1. ProgressBar Section
      ui.Text({
        x: 20,
        y: yPosition + 60,
        width: framework.width - 40,
        text: '1. ProgressBar:',
        fontSize: 18,
        bold: true
      }),
      
      // ✅ ProgressBar avec ref - PLUS BESOIN de création manuelle !
      ui.ProgressBar({
        ref: progressBarRef,
        x: 20,
        y: yPosition + 90,
        width: framework.width - 40,
        progress: 30
      }),
      
      ui.Button({
        x: 20,
        y: yPosition + 140,
        width: 150,
        height: 40,
        text: 'Augmenter',
        onClick: () => {
          if (progressBarRef.current) {
            progressBarRef.current.progress = Math.min(100, progressBarRef.current.progress + 10);
            progressBarRef.current.markDirty();
          }
        }
      }),
      
      // 2. RadioButton Section
      ui.Text({
        x: 20,
        y: yPosition + 200,
        width: framework.width - 40,
        text: '2. RadioButton (Groupe 1):',
        fontSize: 18,
        bold: true
      }),
      
      ui.RadioButton({
        x: 40,
        y: yPosition + 230,
        group: 'groupe1',
        label: 'Option A',
        checked: true,
        onChange: (checked) => {
          if (checked) framework.showToast('Radio A sélectionné');
        }
      }),
      
      ui.RadioButton({
        x: 40,
        y: yPosition + 270,
        group: 'groupe1',
        label: 'Option B',
        onChange: (checked) => {
          if (checked) framework.showToast('Radio B sélectionné');
        }
      }),
      
      // 3. Checkbox Section
      ui.Text({
        x: 20,
        y: yPosition + 330,
        width: framework.width - 40,
        text: '3. Checkbox:',
        fontSize: 18,
        bold: true
      }),
      
      ui.Checkbox({
        x: 40,
        y: yPosition + 360,
        label: 'Accepter les termes',
        checked: false,
        onChange: (checked) => {
          framework.showToast(checked ? 'Coché' : 'Décoché');
        }
      }),
      
      // 4. Card Section
      ui.Text({
        x: 20,
        y: yPosition + 420,
        width: framework.width - 40,
        text: '4. Card:',
        fontSize: 18,
        bold: true
      }),
      
      ui.Card({
        x: 20,
        y: yPosition + 450,
        width: framework.width - 40,
        height: 180,
        padding: 16,
        elevation: 4,
        borderRadius: 8
      }, [
        ui.Text({
          x: 0,
          y: 0,
          width: framework.width - 72,
          text: 'Titre de la carte',
          fontSize: 18,
          bold: true
        }),
        
        ui.Text({
          x: 0,
          y: 40,
          width: framework.width - 72,
          maxWidth: framework.width - 72,
          text: 'Ceci est un exemple de texte à l\'intérieur d\'une carte. Le texte ne devrait plus déborder maintenant car il va à la ligne automatiquement quand il atteint la largeur maximale.',
          fontSize: 14,
          color: '#666666',
          wrap: true
        }),
        
        ui.Button({
          x: 0,
          y: 120,
          width: 150,
          height: 40,
          text: 'Bouton dans Card',
          onClick: () => {
            framework.showToast('Bouton dans Card cliqué!');
          }
        })
      ]),
      
      // 5. Dialog Section
      ui.Text({
        x: 20,
        y: yPosition + 650,
        width: framework.width - 40,
        text: '5. Dialog:',
        fontSize: 18,
        bold: true
      }),
      
      ui.Button({
        x: 20,
        y: yPosition + 680,
        width: 200,
        height: 50,
        text: 'Afficher Dialog',
        onClick: () => {
          const dialog = new Dialog(framework, {
            title: 'Titre du Dialog',
            message: 'Ceci est un message de dialog. Voulez-vous continuer ?',
            buttons: ['Annuler', 'OK'],
            onButtonClick: (index, text) => {
              framework.showToast(`Bouton cliqué: ${text}`);
            }
          });
          framework.add(dialog);
          dialog.show();
        }
      }),
      
      // 6. View Section
      ui.Text({
        x: 20,
        y: yPosition + 760,
        width: framework.width - 40,
        text: '6. View (Container):',
        fontSize: 18,
        bold: true
      }),
      
      ui.View({
        x: 20,
        y: yPosition + 790,
        width: framework.width - 40,
        height: 200,
        padding: 20,
        gap: 10,
        direction: 'column',
        bgColor: '#F0F0F0',
        borderRadius: 8
      }, [
        ui.Text({
          width: framework.width - 80,
          text: 'Contenu dans un View',
          fontSize: 16,
          bold: true
        }),
        
        ui.Button({
          width: 150,
          height: 40,
          text: 'Bouton dans View',
          onClick: () => {
            framework.showToast('Bouton dans View cliqué!');
          }
        }),
        
        ui.Switch({
          checked: true,
          onChange: (checked) => {
            framework.showToast(`Switch dans View: ${checked ? 'ON' : 'OFF'}`);
          }
        })
      ]),
      
      // 7. ContextMenu Section
      ui.Text({
        x: 20,
        y: yPosition + 1020,
        width: framework.width - 40,
        text: '7. ContextMenu:',
        fontSize: 18,
        bold: true
      }),
      
      ui.Button({
        x: 20,
        y: yPosition + 1050,
        width: 200,
        height: 50,
        text: 'Ouvrir Menu Contextuel',
        onClick: () => {
          const menu = new ContextMenu(framework, {
            x: 20,
            y: yPosition + 1110,
            width: 200,
            options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
            onSelect: (index) => {
              framework.showToast(`Option ${index + 1} sélectionnée`);
            }
          });
          framework.add(menu);
        }
      }),
      
      // 8. Input Section
      ui.Text({
        x: 20,
        y: yPosition + 1130,
        width: framework.width - 40,
        text: '8. Input avec valeur:',
        fontSize: 18,
        bold: true
      }),
      
      // ✅ Input avec ref
      ui.Input({
        ref: testInputRef,
        x: 20,
        y: yPosition + 1160,
        width: framework.width - 40,
        height: 50,
        placeholder: 'Tapez quelque chose...',
        value: ''
      }),
      
      ui.Button({
        x: 20,
        y: yPosition + 1230,
        width: 200,
        height: 50,
        text: 'Afficher valeur',
        onClick: () => {
          const value = testInputRef.current?.value || '(vide)';
          framework.showToast(`Valeur: ${value}`);
        }
      }),
      
      // 9. Select Section
      ui.Text({
        x: 20,
        y: yPosition + 1300,
        width: framework.width - 40,
        text: '9. Select avec callback:',
        fontSize: 18,
        bold: true
      }),
      
      ui.Select({
        x: 20,
        y: yPosition + 1330,
        width: framework.width - 40,
        height: 50,
        options: ['Pomme', 'Banane', 'Orange', 'Fraise'],
        selectedIndex: 0,
        onChange: (value, index) => {
          framework.showToast(`Sélectionné: ${value} (index: ${index})`);
        }
      }),
      
      // 10. Switch Section
      ui.Text({
        x: 20,
        y: yPosition + 1410,
        width: framework.width - 40,
        text: '10. Switch avec état:',
        fontSize: 18,
        bold: true
      }),
      
      // ✅ Switch avec ref
      ui.Switch({
        ref: testSwitchRef,
        x: 20,
        y: yPosition + 1440,
        checked: false,
        onChange: (checked) => {
          framework.showToast(`Switch: ${checked ? 'ACTIVÉ' : 'DÉSACTIVÉ'}`);
        }
      }),
      
      // 11. Slider Section
      ui.Text({
        x: 20,
        y: yPosition + 1500,
        width: framework.width - 40,
        text: '11. Slider avec valeur:',
        fontSize: 18,
        bold: true
      }),
      
      // ✅ Text du slider avec ref
      ui.Text({
        ref: sliderDisplayRef,
        x: 20,
        y: yPosition + 1530,
        width: framework.width - 40,
        text: 'Valeur: 50',
        fontSize: 14
      }),
      
      ui.Slider({
        x: 20,
        y: yPosition + 1560,
        width: framework.width - 40,
        height: 40,
        value: 50,
        onChange: (value) => {
          if (sliderDisplayRef.current) {
            sliderDisplayRef.current.text = `Valeur: ${Math.round(value)}`;
            sliderDisplayRef.current.markDirty();
          }
        }
      }),
      
      // FAB flottant
      ui.FAB({
        icon: '+',
        variant: 'medium',
        x: framework.width - 56,
        y: framework.height - 56,
        bgColor: '#6750A4',
        onClick: () => {
          framework.showToast('FAB cliqué!');
        }
      }),
      
      // Bouton pour remonter
      ui.Button({
        x: framework.width / 2 - 100,
        y: yPosition + 1640,
        width: 200,
        height: 50,
        text: '↑ Remonter ↑',
        onClick: () => {
          framework.scrollOffset = 0;
        }
      })
      
    ])
  ).mount(framework);
});

// Lancer l'app
app.navigate('/', { transition: 'none' });
```

## 📄 License

MIT
