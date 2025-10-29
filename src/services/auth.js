import { supabase } from '../supabaseClient.js';

export class AuthService {
  
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  }

  async getProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116: "exact one row not found"
      console.error('Error fetching profile:', error);
    }
    return data;
  }

  async getAllUsersByAdmin(adminId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('admin_vinculado', adminId);

    if (error) {
      console.error('Error fetching users:', error);
      return [];
    }
    return data;
  }

  async getAllAdmins() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nome, email')
      .eq('perfil', 'admin');

    if (error) {
      console.error('Error fetching admins:', error);
      return [];
    }
    return data;
  }
  
  async login(email, password) {
    const DEV_EMAIL = 'robrito10@gmail.com';
    const DEV_PASS = '17020586';

    if (String(email).trim() === DEV_EMAIL && String(password) === DEV_PASS) {
      // This is a local-only dev login, does not use Supabase auth
      const devUser = {
        id: 'dev_user',
        nome: 'DEV',
        email: 'robrito10@gmail.com',
        perfil: 'dev'
      };
      // We simulate a session for the dev user
      sessionStorage.setItem('dev_user', JSON.stringify(devUser));
      return { success: true, user: devUser, profile: devUser };
    }

    // Regular user login
    sessionStorage.removeItem('dev_user');
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: 'Email ou senha inválidos.' };
    }
    return { success: true, user: data.user };
  }

  async register(userData) {
    if (userData.email === 'robrito10@gmail.com') {
      return { success: false, error: 'Este email é reservado e não pode ser cadastrado.' };
    }
    
    const { data, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          nome: userData.nome,
          telefone: userData.telefone,
          perfil: 'admin'
        }
      }
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, user: data.user };
  }

  async inviteDriver(email, nome, adminId) {
    const { data, error } = await supabase.auth.inviteUserByEmail(email, {
      data: {
        nome: nome,
        perfil: 'motorista',
        admin_vinculado: adminId
      },
      redirectTo: window.location.origin
    });

    if (error) {
        if (error.message.includes('unique constraint')) {
            return { success: false, error: 'Este email já está em uso no sistema.' };
        }
        return { success: false, error: error.message };
    }
    return { success: true };
  }
  
  async updateUserPassword(newPassword) {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  }

  async logout() {
    // Also clear dev user session storage
    sessionStorage.removeItem('dev_user');
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error);
    }
  }

  // Check for dev user in session storage
  getDevUser() {
    const devUserJson = sessionStorage.getItem('dev_user');
    return devUserJson ? JSON.parse(devUserJson) : null;
  }
}
