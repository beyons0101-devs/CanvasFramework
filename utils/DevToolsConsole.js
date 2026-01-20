/**
 * Console DevTools pour CanvasFramework
 */
class DevToolsConsole {
  constructor(framework) {
    this.framework = framework;
    this.commands = new Map();
    this.history = [];
    this.historyIndex = -1;
    
    this.setupCommands();
    this.setupConsole();
  }

  setupCommands() {
    this.registerCommand('help', 'Affiche cette aide', () => this.showHelp());
    this.registerCommand('clear', 'Efface la console', () => this.clear());
    this.registerCommand('fps', 'Toggle FPS display', () => {
      this.framework.enableFpsDisplay(!this.framework.showFps);
      return 'FPS display ' + (this.framework.showFps ? 'enabled' : 'disabled');
    });
    
    this.registerCommand('inspect', 'Toggle inspection overlay', () => {
      this.framework.toggleInspection();
      return 'Inspection overlay toggled';
    });
    
    this.registerCommand('components', 'List all components', () => {
      return this.framework.components.map((comp, i) => 
        `${i}: ${comp.constructor.name} [${comp.x},${comp.y}] ${comp.width}x${comp.height}`
      ).join('\n');
    });
    
    this.registerCommand('route', 'Show routing info', () => {
      return `Current: ${this.framework.currentRoute}\nParams: ${JSON.stringify(this.framework.currentParams)}\nHistory: ${this.framework.history.length} entries`;
    });
    
    this.registerCommand('theme', 'Toggle dark/light theme', () => {
      this.framework.toggleDarkMode();
      return `Theme: ${this.framework.theme === this.framework.lightTheme ? 'light' : 'dark'}`;
    });
    
    this.registerCommand('perf', 'Show performance stats', () => {
      const stats = [];
      stats.push(`FPS: ${this.framework.fps}`);
      stats.push(`Components: ${this.framework.components.length}`);
      stats.push(`Dirty: ${Array.from(this.framework.dirtyComponents).length}`);
      stats.push(`Memory: ${performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB' : 'N/A'}`);
      return stats.join('\n');
    });
  }

  registerCommand(name, description, handler) {
    this.commands.set(name, { description, handler });
  }

  setupConsole() {
    // Créer la console
    this.consoleElement = document.createElement('div');
    this.consoleElement.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(0, 0, 0, 0.9);
      color: #0f0;
      font-family: monospace;
      font-size: 12px;
      padding: 10px;
      z-index: 10001;
      display: none;
      max-height: 300px;
      overflow-y: auto;
      border-top: 1px solid #333;
    `;

    // Input
    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.style.cssText = `
      width: 100%;
      background: transparent;
      border: none;
      color: #0f0;
      font-family: monospace;
      font-size: 12px;
      outline: none;
    `;
    this.input.placeholder = 'Enter DevTools command (type "help" for list)...';

    // Output
    this.output = document.createElement('div');
    this.output.style.cssText = `
      margin-bottom: 10px;
      white-space: pre-wrap;
    `;

    this.consoleElement.appendChild(this.output);
    this.consoleElement.appendChild(this.input);
    document.body.appendChild(this.consoleElement);

    // Événements
    this.input.addEventListener('keydown', this.handleInput.bind(this));
    
    // Hotkey pour ouvrir la console
    document.addEventListener('keydown', (e) => {
      if (e.key === '`' && e.ctrlKey) {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  handleInput(e) {
    if (e.key === 'Enter') {
      const command = this.input.value.trim();
      if (command) {
        this.executeCommand(command);
        this.history.push(command);
        this.historyIndex = this.history.length;
        this.input.value = '';
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (this.historyIndex > 0) {
        this.historyIndex--;
        this.input.value = this.history[this.historyIndex];
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (this.historyIndex < this.history.length - 1) {
        this.historyIndex++;
        this.input.value = this.history[this.historyIndex];
      } else {
        this.historyIndex = this.history.length;
        this.input.value = '';
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      this.autoComplete();
    }
  }

  executeCommand(commandStr) {
    const [cmd, ...args] = commandStr.split(' ');
    const command = this.commands.get(cmd);
    
    if (command) {
      try {
        const result = command.handler(...args);
        this.log(`> ${commandStr}\n${result !== undefined ? result : ''}`);
      } catch (error) {
        this.log(`> ${commandStr}\nError: ${error.message}`);
      }
    } else {
      this.log(`> ${commandStr}\nUnknown command: ${cmd}. Type "help" for list.`);
    }
  }

  autoComplete() {
    const partial = this.input.value.trim();
    if (!partial) return;
    
    const matches = Array.from(this.commands.keys())
      .filter(cmd => cmd.startsWith(partial));
    
    if (matches.length === 1) {
      this.input.value = matches[0];
    } else if (matches.length > 1) {
      this.log(`Suggestions: ${matches.join(', ')}`);
    }
  }

  showHelp() {
    const helpText = Array.from(this.commands.entries())
      .map(([name, { description }]) => `${name.padEnd(15)} ${description}`)
      .join('\n');
    return `Available commands:\n${helpText}`;
  }

  log(message) {
    this.output.textContent += message + '\n';
    this.consoleElement.scrollTop = this.consoleElement.scrollHeight;
  }

  clear() {
    this.output.textContent = '';
  }

  toggle() {
    this.consoleElement.style.display = 
      this.consoleElement.style.display === 'none' ? 'block' : 'none';
    
    if (this.consoleElement.style.display === 'block') {
      this.input.focus();
      this.log('CanvasFramework DevTools Console - Ctrl+` to close');
    }
  }
}

export default DevToolsConsole;