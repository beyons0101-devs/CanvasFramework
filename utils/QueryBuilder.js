/**
 * Constructeur de requêtes pour filtrage, tri et pagination de données
 * @class
 * @property {Array} data - Données source
 * @property {Array} filters - Filtres appliqués
 * @property {Array} sorts - Tris appliqués
 * @property {number} offset - Offset de pagination
 * @property {number} limit - Limite de résultats
 */
class QueryBuilder {
  /**
   * Crée une instance de QueryBuilder
   * @param {Array} data - Données à interroger
   */
  constructor(data = []) {
    this.data = data;
    this.filters = [];
    this.sorts = [];
    this.offset = 0;
    this.limit = null;
    this.grouped = null;
  }

  /**
   * Crée une nouvelle instance
   * @param {Array} data - Données
   * @returns {QueryBuilder} Nouvelle instance
   */
  static from(data) {
    return new QueryBuilder(data);
  }

  /**
   * Filtre où la valeur est égale
   * @param {string} field - Champ
   * @param {*} value - Valeur
   * @returns {QueryBuilder} Instance
   */
  where(field, value) {
    this.filters.push({ type: 'equals', field, value });
    return this;
  }

  /**
   * Filtre où la valeur est différente
   * @param {string} field - Champ
   * @param {*} value - Valeur
   * @returns {QueryBuilder} Instance
   */
  whereNot(field, value) {
    this.filters.push({ type: 'not', field, value });
    return this;
  }

  /**
   * Filtre avec opérateur personnalisé
   * @param {string} field - Champ
   * @param {string} operator - Opérateur (>, <, >=, <=, contains, startsWith, endsWith)
   * @param {*} value - Valeur
   * @returns {QueryBuilder} Instance
   */
  whereOperator(field, operator, value) {
    this.filters.push({ type: 'operator', field, operator, value });
    return this;
  }

  /**
   * Filtre où la valeur est dans un tableau
   * @param {string} field - Champ
   * @param {Array} values - Valeurs
   * @returns {QueryBuilder} Instance
   */
  whereIn(field, values) {
    this.filters.push({ type: 'in', field, values });
    return this;
  }

  /**
   * Filtre où la valeur n'est pas dans un tableau
   * @param {string} field - Champ
   * @param {Array} values - Valeurs
   * @returns {QueryBuilder} Instance
   */
  whereNotIn(field, values) {
    this.filters.push({ type: 'notIn', field, values });
    return this;
  }

  /**
   * Filtre avec une fonction personnalisée
   * @param {Function} predicate - Fonction de filtre
   * @returns {QueryBuilder} Instance
   */
  whereCustom(predicate) {
    this.filters.push({ type: 'custom', predicate });
    return this;
  }

  /**
   * Filtre where null
   * @param {string} field - Champ
   * @returns {QueryBuilder} Instance
   */
  whereNull(field) {
    this.filters.push({ type: 'null', field });
    return this;
  }

  /**
   * Filtre where not null
   * @param {string} field - Champ
   * @returns {QueryBuilder} Instance
   */
  whereNotNull(field) {
    this.filters.push({ type: 'notNull', field });
    return this;
  }

  /**
   * Recherche textuelle (like)
   * @param {string} field - Champ
   * @param {string} search - Texte à chercher
   * @param {boolean} [caseSensitive=false] - Sensible à la casse
   * @returns {QueryBuilder} Instance
   */
  search(field, search, caseSensitive = false) {
    this.filters.push({ type: 'search', field, search, caseSensitive });
    return this;
  }

  /**
   * Tri ascendant
   * @param {string} field - Champ
   * @returns {QueryBuilder} Instance
   */
  orderBy(field) {
    this.sorts.push({ field, direction: 'asc' });
    return this;
  }

  /**
   * Tri descendant
   * @param {string} field - Champ
   * @returns {QueryBuilder} Instance
   */
  orderByDesc(field) {
    this.sorts.push({ field, direction: 'desc' });
    return this;
  }

  /**
   * Tri avec comparateur personnalisé
   * @param {Function} compareFn - Fonction de comparaison
   * @returns {QueryBuilder} Instance
   */
  orderByCustom(compareFn) {
    this.sorts.push({ type: 'custom', compareFn });
    return this;
  }

  /**
   * Limite le nombre de résultats
   * @param {number} limit - Nombre max de résultats
   * @returns {QueryBuilder} Instance
   */
  take(limit) {
    this.limit = limit;
    return this;
  }

  /**
   * Saute les N premiers résultats
   * @param {number} offset - Nombre à sauter
   * @returns {QueryBuilder} Instance
   */
  skip(offset) {
    this.offset = offset;
    return this;
  }

  /**
   * Pagination
   * @param {number} page - Numéro de page (1-indexed)
   * @param {number} perPage - Éléments par page
   * @returns {QueryBuilder} Instance
   */
  paginate(page, perPage) {
    this.offset = (page - 1) * perPage;
    this.limit = perPage;
    return this;
  }

  /**
   * Groupe par champ
   * @param {string} field - Champ de groupement
   * @returns {QueryBuilder} Instance
   */
  groupBy(field) {
    this.grouped = field;
    return this;
  }

  /**
   * Applique les filtres
   * @param {Array} data - Données
   * @returns {Array} Données filtrées
   * @private
   */
  applyFilters(data) {
    let result = [...data];

    for (let filter of this.filters) {
      result = result.filter(item => {
        switch (filter.type) {
          case 'equals':
            return item[filter.field] === filter.value;
          
          case 'not':
            return item[filter.field] !== filter.value;
          
          case 'operator':
            return this.applyOperator(item[filter.field], filter.operator, filter.value);
          
          case 'in':
            return filter.values.includes(item[filter.field]);
          
          case 'notIn':
            return !filter.values.includes(item[filter.field]);
          
          case 'null':
            return item[filter.field] == null;
          
          case 'notNull':
            return item[filter.field] != null;
          
          case 'search':
            const fieldValue = String(item[filter.field]);
            const searchValue = filter.search;
            
            if (filter.caseSensitive) {
              return fieldValue.includes(searchValue);
            } else {
              return fieldValue.toLowerCase().includes(searchValue.toLowerCase());
            }
          
          case 'custom':
            return filter.predicate(item);
          
          default:
            return true;
        }
      });
    }

    return result;
  }

  /**
   * Applique un opérateur
   * @param {*} fieldValue - Valeur du champ
   * @param {string} operator - Opérateur
   * @param {*} value - Valeur de comparaison
   * @returns {boolean} Résultat
   * @private
   */
  applyOperator(fieldValue, operator, value) {
    switch (operator) {
      case '>': return fieldValue > value;
      case '<': return fieldValue < value;
      case '>=': return fieldValue >= value;
      case '<=': return fieldValue <= value;
      case 'contains': return String(fieldValue).includes(value);
      case 'startsWith': return String(fieldValue).startsWith(value);
      case 'endsWith': return String(fieldValue).endsWith(value);
      default: return false;
    }
  }

  /**
   * Applique les tris
   * @param {Array} data - Données
   * @returns {Array} Données triées
   * @private
   */
  applySorts(data) {
    if (this.sorts.length === 0) return data;

    return [...data].sort((a, b) => {
      for (let sort of this.sorts) {
        if (sort.type === 'custom') {
          return sort.compareFn(a, b);
        }

        const aVal = a[sort.field];
        const bVal = b[sort.field];
        
        let comparison = 0;
        
        if (aVal == null && bVal == null) continue;
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          comparison = aVal - bVal;
        } else {
          comparison = String(aVal).localeCompare(String(bVal));
        }
        
        if (comparison !== 0) {
          return sort.direction === 'asc' ? comparison : -comparison;
        }
      }
      
      return 0;
    });
  }

  /**
   * Applique la pagination
   * @param {Array} data - Données
   * @returns {Array} Données paginées
   * @private
   */
  applyPagination(data) {
    const start = this.offset;
    const end = this.limit ? start + this.limit : data.length;
    return data.slice(start, end);
  }

  /**
   * Applique le groupement
   * @param {Array} data - Données
   * @returns {Object} Données groupées
   * @private
   */
  applyGrouping(data) {
    const groups = {};
    
    for (let item of data) {
      const key = item[this.grouped];
      
      if (!groups[key]) {
        groups[key] = [];
      }
      
      groups[key].push(item);
    }
    
    return groups;
  }

  /**
   * Exécute la requête et retourne les résultats
   * @returns {Array|Object} Résultats
   */
  get() {
    let result = this.applyFilters(this.data);
    result = this.applySorts(result);
    
    if (this.grouped) {
      return this.applyGrouping(result);
    }
    
    result = this.applyPagination(result);
    return result;
  }

  /**
   * Retourne le premier résultat
   * @returns {*} Premier élément ou null
   */
  first() {
    const results = this.take(1).get();
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Compte les résultats
   * @returns {number} Nombre de résultats
   */
  count() {
    return this.applyFilters(this.data).length;
  }

  /**
   * Vérifie si des résultats existent
   * @returns {boolean} True si résultats
   */
  exists() {
    return this.count() > 0;
  }

  /**
   * Obtient des valeurs uniques d'un champ
   * @param {string} field - Champ
   * @returns {Array} Valeurs uniques
   */
  pluck(field) {
    return this.get().map(item => item[field]);
  }

  /**
   * Obtient des valeurs uniques
   * @param {string} field - Champ
   * @returns {Array} Valeurs uniques
   */
  unique(field) {
    return [...new Set(this.pluck(field))];
  }

  /**
   * Calcule la somme d'un champ
   * @param {string} field - Champ
   * @returns {number} Somme
   */
  sum(field) {
    return this.get().reduce((sum, item) => sum + (Number(item[field]) || 0), 0);
  }

  /**
   * Calcule la moyenne d'un champ
   * @param {string} field - Champ
   * @returns {number} Moyenne
   */
  avg(field) {
    const items = this.get();
    return items.length > 0 ? this.sum(field) / items.length : 0;
  }

  /**
   * Trouve le minimum d'un champ
   * @param {string} field - Champ
   * @returns {number} Minimum
   */
  min(field) {
    const values = this.pluck(field).filter(v => v != null);
    return values.length > 0 ? Math.min(...values) : null;
  }

  /**
   * Trouve le maximum d'un champ
   * @param {string} field - Champ
   * @returns {number} Maximum
   */
  max(field) {
    const values = this.pluck(field).filter(v => v != null);
    return values.length > 0 ? Math.max(...values) : null;
  }

  /**
   * Clone la requête
   * @returns {QueryBuilder} Nouveau builder
   */
  clone() {
    const builder = new QueryBuilder(this.data);
    builder.filters = [...this.filters];
    builder.sorts = [...this.sorts];
    builder.offset = this.offset;
    builder.limit = this.limit;
    builder.grouped = this.grouped;
    return builder;
  }

  /**
   * Réinitialise la requête
   * @returns {QueryBuilder} Instance
   */
  reset() {
    this.filters = [];
    this.sorts = [];
    this.offset = 0;
    this.limit = null;
    this.grouped = null;
    return this;
  }
}

export default QueryBuilder;