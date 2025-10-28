export class DataService {
  constructor() {
    this.carsKey = 'gerencial_fretes_cars';
    this.tiresKey = 'gerencial_fretes_tires';
    this.tireBrandsKey = 'gerencial_fretes_tire_brands';
    this.cyclesKey = 'gerencial_fretes_cycles';
    this.freightsKey = 'gerencial_fretes_freights';
    this.fuelingsKey = 'gerencial_fretes_fuelings';
    this.expensesKey = 'gerencial_fretes_expenses';
    this.settingsKey = 'gerencial_fretes_settings';
    this.permissionsKey = 'gerencial_fretes_permissions';
  }

  _getArrayFromStorage(key) {
    const dataJson = localStorage.getItem(key);
    if (!dataJson) {
      return [];
    }
    try {
      const data = JSON.parse(dataJson);
      if (Array.isArray(data)) {
        return data;
      }
      console.warn(`Corrupted data for key ${key} (not an array). Resetting.`);
      localStorage.setItem(key, '[]');
      return [];
    } catch (error) {
      console.error(`Error parsing JSON for key ${key}. Resetting.`, error);
      localStorage.setItem(key, '[]');
      return [];
    }
  }

  getCars(adminId) {
    const cars = this._getArrayFromStorage(this.carsKey);
    return cars.filter(car => car.adminId === adminId);
  }

  saveCar(car, adminId) {
    const cars = this._getArrayFromStorage(this.carsKey);
    const newCar = {
      id: Date.now().toString(),
      ...car,
      adminId,
      createdAt: new Date().toISOString()
    };
    cars.push(newCar);
    localStorage.setItem(this.carsKey, JSON.stringify(cars));
    return newCar;
  }

  updateCar(carId, updates) {
    const cars = this._getArrayFromStorage(this.carsKey);
    const index = cars.findIndex(c => c.id === carId);
    if (index !== -1) {
      cars[index] = { ...cars[index], ...updates };
      localStorage.setItem(this.carsKey, JSON.stringify(cars));
      return cars[index];
    }
    return null;
  }

  deleteCar(carId) {
    const cars = this._getArrayFromStorage(this.carsKey);
    const filtered = cars.filter(c => c.id !== carId);
    localStorage.setItem(this.carsKey, JSON.stringify(filtered));
  }

  getTireBrands() {
    return this._getArrayFromStorage(this.tireBrandsKey);
  }

  saveTireBrand(brand) {
    const brands = this._getArrayFromStorage(this.tireBrandsKey);
    const newBrand = {
      id: Date.now().toString(),
      name: brand,
      createdAt: new Date().toISOString()
    };
    brands.push(newBrand);
    localStorage.setItem(this.tireBrandsKey, JSON.stringify(brands));
    return newBrand;
  }

  getTireChanges(adminId) {
    const changes = this._getArrayFromStorage(this.tiresKey);
    return changes.filter(change => change.adminId === adminId);
  }

  saveTireChange(change, adminId) {
    const changes = this._getArrayFromStorage(this.tiresKey);
    const newChange = {
      id: Date.now().toString(),
      ...change,
      adminId,
      createdAt: new Date().toISOString()
    };
    changes.push(newChange);
    localStorage.setItem(this.tiresKey, JSON.stringify(changes));
    return newChange;
  }

  getCycles(adminId, driverId = null) {
    const cycles = this._getArrayFromStorage(this.cyclesKey);
    let filtered = cycles.filter(cycle => cycle.adminId === adminId);
    
    if (driverId) {
      filtered = filtered.filter(cycle => cycle.driverId === driverId);
    }
    
    return filtered;
  }

  saveCycle(cycle, adminId) {
    const cycles = this._getArrayFromStorage(this.cyclesKey);
    const newCycle = {
      id: Date.now().toString(),
      ...cycle,
      adminId,
      createdAt: new Date().toISOString()
    };
    cycles.push(newCycle);
    localStorage.setItem(this.cyclesKey, JSON.stringify(cycles));
    return newCycle;
  }

  updateCycle(cycleId, updates) {
    const cycles = this._getArrayFromStorage(this.cyclesKey);
    const index = cycles.findIndex(c => c.id === cycleId);
    if (index !== -1) {
      cycles[index] = { ...cycles[index], ...updates };
      localStorage.setItem(this.cyclesKey, JSON.stringify(cycles));
      return cycles[index];
    }
    return null;
  }

  deleteCycle(cycleId) {
    let cycles = this._getArrayFromStorage(this.cyclesKey);
    cycles = cycles.filter(c => c.id !== cycleId);
    localStorage.setItem(this.cyclesKey, JSON.stringify(cycles));

    let freights = this._getArrayFromStorage(this.freightsKey);
    freights = freights.filter(f => f.cycleId !== cycleId);
    localStorage.setItem(this.freightsKey, JSON.stringify(freights));

    let fuelings = this._getArrayFromStorage(this.fuelingsKey);
    fuelings = fuelings.filter(f => f.cycleId !== cycleId);
    localStorage.setItem(this.fuelingsKey, JSON.stringify(fuelings));

    let expenses = this._getArrayFromStorage(this.expensesKey);
    expenses = expenses.filter(e => e.cycleId !== cycleId);
    localStorage.setItem(this.expensesKey, JSON.stringify(expenses));
  }

  getFreights(cycleId) {
    const freights = this._getArrayFromStorage(this.freightsKey);
    return freights.filter(f => f.cycleId === cycleId);
  }

  saveFreight(freight, cycleId) {
    const freights = this._getArrayFromStorage(this.freightsKey);
    const newFreight = {
      id: Date.now().toString(),
      ...freight,
      cycleId,
      createdAt: new Date().toISOString()
    };
    freights.push(newFreight);
    localStorage.setItem(this.freightsKey, JSON.stringify(freights));
    return newFreight;
  }

  updateFreight(freightId, updates) {
    const freights = this._getArrayFromStorage(this.freightsKey);
    const index = freights.findIndex(f => f.id === freightId);
    if (index !== -1) {
      freights[index] = { ...freights[index], ...updates };
      localStorage.setItem(this.freightsKey, JSON.stringify(freights));
      return freights[index];
    }
    return null;
  }

  deleteFreight(freightId) {
    const freights = this._getArrayFromStorage(this.freightsKey);
    const filtered = freights.filter(f => f.id !== freightId);
    localStorage.setItem(this.freightsKey, JSON.stringify(filtered));
  }

  getFuelings(cycleId) {
    const fuelings = this._getArrayFromStorage(this.fuelingsKey);
    return fuelings.filter(f => f.cycleId === cycleId);
  }

  saveFueling(fueling, cycleId) {
    const fuelings = this._getArrayFromStorage(this.fuelingsKey);
    const newFueling = {
      id: Date.now().toString(),
      ...fueling,
      cycleId,
      createdAt: new Date().toISOString()
    };
    fuelings.push(newFueling);
    localStorage.setItem(this.fuelingsKey, JSON.stringify(fuelings));
    return newFueling;
  }

  updateFueling(fuelingId, updates) {
    const fuelings = this._getArrayFromStorage(this.fuelingsKey);
    const index = fuelings.findIndex(f => f.id === fuelingId);
    if (index !== -1) {
      fuelings[index] = { ...fuelings[index], ...updates };
      localStorage.setItem(this.fuelingsKey, JSON.stringify(fuelings));
      return fuelings[index];
    }
    return null;
  }

  deleteFueling(fuelingId) {
    const fuelings = this._getArrayFromStorage(this.fuelingsKey);
    const filtered = fuelings.filter(f => f.id !== fuelingId);
    localStorage.setItem(this.fuelingsKey, JSON.stringify(filtered));
  }

  getExpenses(cycleId) {
    const expenses = this._getArrayFromStorage(this.expensesKey);
    return expenses.filter(e => e.cycleId === cycleId);
  }

  saveExpense(expense, cycleId) {
    const expenses = this._getArrayFromStorage(this.expensesKey);
    const newExpense = {
      id: Date.now().toString(),
      ...expense,
      cycleId,
      createdAt: new Date().toISOString()
    };
    expenses.push(newExpense);
    localStorage.setItem(this.expensesKey, JSON.stringify(expenses));
    return newExpense;
  }

  updateExpense(expenseId, updates) {
    const expenses = this._getArrayFromStorage(this.expensesKey);
    const index = expenses.findIndex(e => e.id === expenseId);
    if (index !== -1) {
      expenses[index] = { ...expenses[index], ...updates };
      localStorage.setItem(this.expensesKey, JSON.stringify(expenses));
      return expenses[index];
    }
    return null;
  }

  deleteExpense(expenseId) {
    const expenses = this._getArrayFromStorage(this.expensesKey);
    const filtered = expenses.filter(e => e.id !== expenseId);
    localStorage.setItem(this.expensesKey, JSON.stringify(filtered));
  }

  getSettings(adminId) {
    const settings = JSON.parse(localStorage.getItem(this.settingsKey) || '{}');
    return settings[adminId] || { commissionPercentage: 10 };
  }

  saveSettings(adminId, settings) {
    const allSettings = JSON.parse(localStorage.getItem(this.settingsKey) || '{}');
    allSettings[adminId] = settings;
    localStorage.setItem(this.settingsKey, JSON.stringify(allSettings));
  }

  getPermissions(driverId) {
    const permissions = JSON.parse(localStorage.getItem(this.permissionsKey) || '{}');
    return permissions[driverId] || {
      viewTireChanges: true,
      viewFuelings: true,
      viewExpenses: true
    };
  }

  savePermissions(driverId, permissions) {
    const allPermissions = JSON.parse(localStorage.getItem(this.permissionsKey) || '{}');
    allPermissions[driverId] = permissions;
    localStorage.setItem(this.permissionsKey, JSON.stringify(allPermissions));
  }
}
