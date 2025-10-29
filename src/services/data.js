import { supabase } from '../supabaseClient.js';

export class DataService {

  async _uploadFileAndGetUrl(bucket, file, filePath) {
    if (!file) return { data: null, error: null };

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error(`Upload error for ${bucket}:`, uploadError);
      return { data: null, error: uploadError };
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(uploadData.path);
    return { data: { publicUrl: urlData.publicUrl }, error: null };
  }

  // Cars
  async getCars(adminId) {
    const { data, error } = await supabase.from('cars').select('*').eq('admin_id', adminId);
    return error ? [] : data;
  }

  async saveCar(car, adminId) {
    const { data, error } = await supabase.from('cars').insert([{ ...car, admin_id: adminId }]).select();
    return { data, error };
  }

  async deleteCar(carId) {
    const { error } = await supabase.from('cars').delete().eq('id', carId);
    return { error };
  }

  // Tire Brands
  async getTireBrands() {
    const { data, error } = await supabase.from('tire_brands').select('*');
    return error ? [] : data;
  }

  async saveTireBrand(brandName) {
    const { data, error } = await supabase.from('tire_brands').insert([{ name: brandName }]).select();
    return { data, error };
  }

  // Tire Changes
  async getTireChanges(adminId, carId) {
    let query = supabase.from('tire_changes').select('*').eq('admin_id', adminId);
    if (carId) {
      query = query.eq('car_id', carId);
    }
    const { data, error } = await query;
    return error ? [] : data;
  }

  async saveTireChange(change, adminId, photoFile) {
    let photoUrl = null;
    if (photoFile) {
      const filePath = `${adminId}/${change.car_id}/${Date.now()}_${photoFile.name}`;
      const { data, error } = await this._uploadFileAndGetUrl('tire_change_photos', photoFile, filePath);
      if (error) return { data: null, error };
      photoUrl = data.publicUrl;
    }
    const changeData = { ...change, admin_id: adminId, photo_url: photoUrl };
    const { data, error } = await supabase.from('tire_changes').insert([changeData]).select().single();
    return { data, error };
  }

  // Cycles
  async getCycles(adminId, driverId = null) {
    let query = supabase.from('cycles').select('*').eq('admin_id', adminId);
    if (driverId) {
      query = query.eq('driver_id', driverId);
    }
    const { data, error } = await query;
    return error ? [] : data;
  }

  async saveCycle(cycle, adminId, photoFile) {
    let photoUrl = null;
    if (photoFile) {
      const filePath = `${adminId}/${Date.now()}_${photoFile.name}`;
      const { data, error } = await this._uploadFileAndGetUrl('cycle_photos', photoFile, filePath);
      if (error) return { data: null, error };
      photoUrl = data.publicUrl;
    }
    const cycleData = { ...cycle, admin_id: adminId, km_saida_photo_url: photoUrl };
    const { data, error } = await supabase.from('cycles').insert([cycleData]).select().single();
    return { data, error };
  }

  async updateCycle(cycleId, updates, photoFile) {
    let photoUrl = updates.km_saida_photo_url;
    if (photoFile) {
      const filePath = `${updates.admin_id}/${cycleId}/${Date.now()}_${photoFile.name}`;
      const { data, error } = await this._uploadFileAndGetUrl('cycle_photos', photoFile, filePath);
      if (error) return { data: null, error };
      photoUrl = data.publicUrl;
    }
    const cycleData = { ...updates, km_saida_photo_url: photoUrl };
    const { data, error } = await supabase.from('cycles').update(cycleData).eq('id', cycleId).select().single();
    return { data, error };
  }

  async deleteCycle(cycleId) {
    // Supabase cascade delete will handle related records
    const { error } = await supabase.from('cycles').delete().eq('id', cycleId);
    return { error };
  }

  // Freights
  async getFreights(cycleId) {
    const { data, error } = await supabase.from('freights').select('*').eq('cycle_id', cycleId);
    return error ? [] : data;
  }

  async saveFreight(freight, cycleId, files) {
    let departureUrl = null, arrivalUrl = null;
    if (files.departure) {
      const path = `${cycleId}/${Date.now()}_departure_${files.departure.name}`;
      const { data, error } = await this._uploadFileAndGetUrl('freight_photos', files.departure, path);
      if (error) return { data: null, error };
      departureUrl = data.publicUrl;
    }
    if (files.arrival) {
      const path = `${cycleId}/${Date.now()}_arrival_${files.arrival.name}`;
      const { data, error } = await this._uploadFileAndGetUrl('freight_photos', files.arrival, path);
      if (error) return { data: null, error };
      arrivalUrl = data.publicUrl;
    }
    const freightData = { ...freight, cycle_id: cycleId, departure_photo_url: departureUrl, arrival_photo_url: arrivalUrl };
    const { data, error } = await supabase.from('freights').insert([freightData]).select().single();
    return { data, error };
  }

  async updateFreight(freightId, updates, files) {
    let departureUrl = updates.departure_photo_url, arrivalUrl = updates.arrival_photo_url;
    if (files.departure) {
      const path = `${updates.cycle_id}/${freightId}_departure_${files.departure.name}`;
      const { data, error } = await this._uploadFileAndGetUrl('freight_photos', files.departure, path);
      if (error) return { data: null, error };
      departureUrl = data.publicUrl;
    }
    if (files.arrival) {
      const path = `${updates.cycle_id}/${freightId}_arrival_${files.arrival.name}`;
      const { data, error } = await this._uploadFileAndGetUrl('freight_photos', files.arrival, path);
      if (error) return { data: null, error };
      arrivalUrl = data.publicUrl;
    }
    const freightData = { ...updates, departure_photo_url: departureUrl, arrival_photo_url: arrivalUrl };
    const { data, error } = await supabase.from('freights').update(freightData).eq('id', freightId).select().single();
    return { data, error };
  }

  async deleteFreight(freightId) {
    const { error } = await supabase.from('freights').delete().eq('id', freightId);
    return { error };
  }

  // Fuelings
  async getFuelings(cycleId) {
    const { data, error } = await supabase.from('fuelings').select('*').eq('cycle_id', cycleId);
    return error ? [] : data;
  }

  async saveFueling(fueling, cycleId, files) {
    let kmUrl = null, receiptUrl = null;
    if (files.km) {
      const path = `${cycleId}/${Date.now()}_km_${files.km.name}`;
      const { data, error } = await this._uploadFileAndGetUrl('fueling_photos', files.km, path);
      if (error) return { data: null, error };
      kmUrl = data.publicUrl;
    }
    if (files.receipt) {
      const path = `${cycleId}/${Date.now()}_receipt_${files.receipt.name}`;
      const { data, error } = await this._uploadFileAndGetUrl('fueling_photos', files.receipt, path);
      if (error) return { data: null, error };
      receiptUrl = data.publicUrl;
    }
    const fuelingData = { ...fueling, cycle_id: cycleId, km_photo_url: kmUrl, receipt_photo_url: receiptUrl };
    const { data, error } = await supabase.from('fuelings').insert([fuelingData]).select().single();
    return { data, error };
  }

  async updateFueling(fuelingId, updates, files) {
    let kmUrl = updates.km_photo_url, receiptUrl = updates.receipt_photo_url;
    if (files.km) {
      const path = `${updates.cycle_id}/${fuelingId}_km_${files.km.name}`;
      const { data, error } = await this._uploadFileAndGetUrl('fueling_photos', files.km, path);
      if (error) return { data: null, error };
      kmUrl = data.publicUrl;
    }
    if (files.receipt) {
      const path = `${updates.cycle_id}/${fuelingId}_receipt_${files.receipt.name}`;
      const { data, error } = await this._uploadFileAndGetUrl('fueling_photos', files.receipt, path);
      if (error) return { data: null, error };
      receiptUrl = data.publicUrl;
    }
    const fuelingData = { ...updates, km_photo_url: kmUrl, receipt_photo_url: receiptUrl };
    const { data, error } = await supabase.from('fuelings').update(fuelingData).eq('id', fuelingId).select().single();
    return { data, error };
  }

  async deleteFueling(fuelingId) {
    const { error } = await supabase.from('fuelings').delete().eq('id', fuelingId);
    return { error };
  }

  // Expenses
  async getExpenses(cycleId) {
    const { data, error } = await supabase.from('expenses').select('*').eq('cycle_id', cycleId);
    return error ? [] : data;
  }

  async saveExpense(expense, cycleId, receiptFile) {
    let receiptUrl = null;
    if (receiptFile) {
      const path = `${cycleId}/${Date.now()}_${receiptFile.name}`;
      const { data, error } = await this._uploadFileAndGetUrl('expense_photos', receiptFile, path);
      if (error) return { data: null, error };
      receiptUrl = data.publicUrl;
    }
    const expenseData = { ...expense, cycle_id: cycleId, receipt_photo_url: receiptUrl };
    const { data, error } = await supabase.from('expenses').insert([expenseData]).select().single();
    return { data, error };
  }

  async updateExpense(expenseId, updates, receiptFile) {
    let receiptUrl = updates.receipt_photo_url;
    if (receiptFile) {
      const path = `${updates.cycle_id}/${expenseId}_${receiptFile.name}`;
      const { data, error } = await this._uploadFileAndGetUrl('expense_photos', receiptFile, path);
      if (error) return { data: null, error };
      receiptUrl = data.publicUrl;
    }
    const expenseData = { ...updates, receipt_photo_url: receiptUrl };
    const { data, error } = await supabase.from('expenses').update(expenseData).eq('id', expenseId).select().single();
    return { data, error };
  }

  async deleteExpense(expenseId) {
    const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
    return { error };
  }

  // Settings
  async getSettings(adminId) {
    const { data, error } = await supabase.from('settings').select('commission_percentage').eq('admin_id', adminId).single();
    if (error && error.code === 'PGRST116') {
      return { commission_percentage: 10 }; // Default
    }
    return error ? { commission_percentage: 10 } : data;
  }

  async saveSettings(adminId, settings) {
    const { error } = await supabase.from('settings').upsert({ admin_id: adminId, ...settings });
    return { error };
  }

  // Permissions
  async getPermissions(driverId) {
    const { data, error } = await supabase.from('driver_permissions').select('*').eq('driver_id', driverId).single();
    if (error && error.code === 'PGRST116') {
      return { view_tire_changes: true, view_fuelings: true, view_expenses: true }; // Default
    }
    return error ? { view_tire_changes: true, view_fuelings: true, view_expenses: true } : data;
  }

  async savePermissions(driverId, permissions) {
    const { error } = await supabase.from('driver_permissions').upsert({ driver_id: driverId, ...permissions });
    return { error };
  }
}
